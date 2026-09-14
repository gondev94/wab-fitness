import {
    SessionModel,
    type SessionStatus,
    type SessionVisibility,
} from "../models/session.model.js";
import {
    TrainingModel,
    type TrainingTypeSlug,
} from "../models/training.model.js";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

export type FindSessionsInput = {
    from: string;
    to: string;
    includeMemberSessions: boolean;
    trainingTypeId?: string;
};

export type CreateSessionInput = {
    trainingTypeId: string;
    date: string;
    startTime: string;
    endTime: string;
    maxCapacity?: number | undefined;
    status?: SessionStatus | undefined;
    visibility?: SessionVisibility | undefined;
    blockedReason?: string | undefined;
    priorityOpensAt?: string | undefined;
    generalOpensAt?: string | undefined;
};

export type UpdateSessionInput = {
    date?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    maxCapacity?: number | undefined;
    status?: SessionStatus | undefined;
    visibility?: SessionVisibility | undefined;
    blockedReason?: string | undefined;
    priorityOpensAt?: string | undefined;
    generalOpensAt?: string | undefined;
};

// Fila cruda de Supabase (sessions + join a training_types).
// Lo tipamos para no copiar el shape en cada método y evitar `any`.
type SessionRow = {
    id: string;
    training_type: {
        id: string;
        name: string;
        slug: TrainingTypeSlug;
        description: string;
        duration_minutes: number;
        max_capacity: number;
        color: string;
        icon: string;
        is_active: boolean;
        created_at: string;
    } | null;
    date: string;
    start_time: string;
    end_time: string;
    max_capacity?: number | null;
    status: SessionStatus;
    visibility: SessionVisibility;
    blocked_reason?: string | null;
    priority_opens_at?: string | null;
    general_opens_at?: string | null;
    created_at: string;
    updated_at: string;
};

const SESSION_SELECT = "*, training_type:training_types(*)";

export class SessionRepository {
    async findByDateRange({
        from,
        to,
        includeMemberSessions,
    }: FindSessionsInput): Promise<SessionModel[]> {
        const supabase = getSupabaseAdmin();

        let query = supabase
            .from("sessions")
            .select(SESSION_SELECT)
            .gte("date", from)
            .lte("date", to)
            .order("date", { ascending: true });

        if (!includeMemberSessions) {
            query = query.eq("visibility", "Public");
        }

        const { data: sessions, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        if (!sessions || sessions.length === 0) {
            return [];
        }

        const sessionIds = sessions.map((s) => s.id);
        const counts = await this.countConfirmed(sessionIds);

        return (sessions as SessionRow[]).map((s) =>
            this.toModel(s, counts.get(s.id) ?? 0),
        );
    }

    async findById(id: string): Promise<SessionModel | null> {
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from("sessions")
            .select(SESSION_SELECT)
            .eq("id", id)
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) return null;

        const counts = await this.countConfirmed([data.id]);
        return this.toModel(data as SessionRow, counts.get(data.id) ?? 0);
    }

    async create(input: CreateSessionInput): Promise<SessionModel> {
        const supabase = getSupabaseAdmin();

        const { data: trainingType, error: typeError } = await supabase
            .from("training_types")
            .select("id, is_active")
            .eq("id", input.trainingTypeId)
            .maybeSingle();

        if (typeError) throw new Error(typeError.message);
        if (!trainingType) throw new Error("TRAINING_TYPE_NOT_FOUND");
        if (!trainingType.is_active) throw new Error("TRAINING_TYPE_INACTIVE");

        const { data, error } = await supabase
            .from("sessions")
            .insert({
                training_type_id: input.trainingTypeId,
                date: input.date,
                start_time: input.startTime,
                end_time: input.endTime,
                max_capacity: input.maxCapacity,
                status: input.status ?? "Open",
                visibility: input.visibility ?? "Public",
                blocked_reason: input.blockedReason,
                priority_opens_at: input.priorityOpensAt,
                general_opens_at: input.generalOpensAt,
            })
            .select(SESSION_SELECT)
            .single();

        if (error) {
            if ((error as { code?: string }).code === "23505") {
                throw new Error("SESSION_ALREADY_EXISTS");
            }
            throw new Error(error.message);
        }
        if (!data) throw new Error("Failed to create session");

        return this.toModel(data as SessionRow, 0);
    }

    async update(id: string, input: UpdateSessionInput): Promise<SessionModel> {
        const supabase = getSupabaseAdmin();

        const existing = await this.findById(id);
        if (!existing) throw new Error("SESSION_NOT_FOUND");

        const patch: Record<string, string | number | null | undefined> = {};
        if (input.date !== undefined) patch.date = input.date;
        if (input.startTime !== undefined) patch.start_time = input.startTime;
        if (input.endTime !== undefined) patch.end_time = input.endTime;
        if (input.maxCapacity !== undefined)
            patch.max_capacity = input.maxCapacity;
        if (input.status !== undefined) patch.status = input.status;
        if (input.visibility !== undefined) patch.visibility = input.visibility;
        if (input.blockedReason !== undefined)
            patch.blocked_reason = input.blockedReason;
        if (input.priorityOpensAt !== undefined)
            patch.priority_opens_at = input.priorityOpensAt;
        if (input.generalOpensAt !== undefined)
            patch.general_opens_at = input.generalOpensAt;

        const { data, error } = await supabase
            .from("sessions")
            .update(patch)
            .eq("id", id)
            .select(SESSION_SELECT)
            .single();

        if (error || !data) {
            throw new Error(error?.message ?? "Failed to update session");
        }

        const counts = await this.countConfirmed([id]);
        return this.toModel(data as SessionRow, counts.get(id) ?? 0);
    }

    async cancel(id: string): Promise<SessionModel> {
        const existing = await this.findById(id);
        if (!existing) throw new Error("SESSION_NOT_FOUND");
        if (existing.status === "Cancelled")
            throw new Error("SESSION_ALREADY_CANCELLED");

        return this.update(id, { status: "Cancelled" });
    }

    private async countConfirmed(
        sessionIds: string[],
    ): Promise<Map<string, number>> {
        const counts = new Map<string, number>();
        if (sessionIds.length === 0) return counts;

        const supabase = getSupabaseAdmin();
        const { data: bookings, error } = await supabase
            .from("bookings")
            .select("session_id")
            .in("session_id", sessionIds)
            .eq("status", "Confirmed");

        if (error) throw new Error(error.message);

        for (const b of bookings ?? []) {
            counts.set(b.session_id, (counts.get(b.session_id) ?? 0) + 1);
        }
        return counts;
    }

    private toModel(s: SessionRow, currentBookings: number): SessionModel {
        return new SessionModel({
            id: s.id,
            trainingTypeId: s.training_type?.id ?? "",
            trainingType: s.training_type
                ? new TrainingModel({
                      id: s.training_type.id,
                      name: s.training_type.name,
                      slug: s.training_type.slug,
                      description: s.training_type.description,
                      durationMinutes: s.training_type.duration_minutes,
                      maxCapacity: s.training_type.max_capacity,
                      color: s.training_type.color,
                      icon: s.training_type.icon,
                      isActive: s.training_type.is_active,
                      createdAt: new Date(s.training_type.created_at),
                  })
                : undefined,
            date: new Date(s.date),
            startTime: s.start_time,
            endTime: s.end_time,
            maxCapacity: s.max_capacity ?? s.training_type?.max_capacity,
            currentBookings,
            status: s.status,
            visibility: s.visibility,
            blockedReason: s.blocked_reason ?? undefined,
            priorityOpensAt: s.priority_opens_at
                ? new Date(s.priority_opens_at)
                : undefined,
            generalOpensAt: s.general_opens_at
                ? new Date(s.general_opens_at)
                : undefined,
            createdAt: new Date(s.created_at),
            updatedAt: new Date(s.updated_at),
        });
    }
}
