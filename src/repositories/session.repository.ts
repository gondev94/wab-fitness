import { SessionModel } from "../models/session.model.js";
import { TrainingModel } from "../models/training.model.js";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

export type FindSessionsInput = {
    from: string;
    to: string;
    includeMemberSessions: boolean;
}

export class SessionRepository {
    async findByDateRange({ from, to, includeMemberSessions}: FindSessionsInput): Promise<SessionModel[]> {
        const supabase = getSupabaseAdmin();

        let query = supabase
            .from('sessions')
            .select('*, training_type:training_types(*)')
            .gte('date', from)
            .lte('date', to)
            .order('date', { ascending: true})

        if(!includeMemberSessions) {
            query = query.eq('visibility', 'Public');
        }

        const { data: sessions, error } = await query;

        if(error) {
            throw new Error(error.message);
        }

        if(!sessions || sessions.length === 0) {
            return [];
        }

        const sessionIds = sessions.map((s) => s.id);

        const {data: bookings, error: bookingsError} = await supabase
            .from('bookings')
            .select('session_id')
            .in('session_id', sessionIds)
            .eq('status', 'Confirmed');

        if(bookingsError) {
            throw new Error(bookingsError.message);
        }

        const counts = new Map<string, number>();
        for (const b of bookings ?? []) {
            counts.set(b.session_id, (counts.get(b.session_id) ?? 0) + 1);
        }

        return sessions.map((s) => new SessionModel({
            id: s.id,
            trainingTypeId: s.training_type.id,
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
                currentBookings: counts.get(s.id) ?? 0,
                status: s.status,
                visibility: s.visibility,
                blockedReason: s.blocked_reason ?? undefined,
                priorityOpensAt: s.priority_opens_at ? new Date(s.priority_opens_at) : undefined,
                generalOpensAt: s.general_opens_at ? new Date(s.general_opens_at) : undefined,
                createdAt: new Date(s.created_at),
                updatedAt: new Date(s.updated_at),

        }))
            
    }
}