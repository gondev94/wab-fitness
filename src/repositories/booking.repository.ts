import {
    BookingModel,
    type BookingCancelReason,
} from "../models/booking.model.js";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

export type CreateBookingInput = {
    userId: string;
    sessionId: string;
};

export type CancelBookingInput = {
    bookingId: string;
    cancelReason?: BookingCancelReason;
};

export type ListBookingsInput = {
    sessionId?: string | undefined;
    userId?: string | undefined;
    page: number;
    limit: number;
};

const BOOKING_RPC_CODES = new Set([
    "SESSION_NOT_FOUND",
    "SESSION_NOT_OPEN",
    "DUPLICATE_BOOKING",
]);

function mapBookingRpcError(message: string, code?: string): string {
    if (code === "23505") return "DUPLICATE_BOOKING";
    for (const known of BOOKING_RPC_CODES) {
        if (message.includes(known)) return known;
    }
    return message;
}

export class BookingRepository {
    async create({
        userId,
        sessionId,
    }: CreateBookingInput): Promise<BookingModel> {
        const supabase = getSupabaseAdmin();

        const { data: session, error: sessionError } = await supabase
            .from("sessions")
            .select("*, training_type:training_types(*)")
            .eq("id", sessionId)
            .maybeSingle();

        if (sessionError) throw new Error(sessionError.message);
        if (!session) throw new Error("SESSION_NOT_FOUND");
        if (session.status !== "Open") throw new Error("SESSION_NOT_OPEN");

        const now = new Date();
        const priorityOpensAt = session.priority_opens_at
            ? new Date(session.priority_opens_at)
            : null;
        const generalOpensAt = session.general_opens_at
            ? new Date(session.general_opens_at)
            : null;
        const opensAt = priorityOpensAt ?? generalOpensAt;
        if (opensAt && now < opensAt) {
            throw new Error("SESSION_NOT_OPEN_YET");
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id, role, profile_training_types(training_type_id)")
            .eq("id", userId)
            .maybeSingle();

        if (!profile) throw new Error("USER_NOT_FOUND");
        if (profile.role !== "user") throw new Error("USER_NOT_BOOKABLE");

        const sessionTypeId =
            session.training_type_id ?? session.training_type?.id;
        const hasTrainingType = (
            profile.profile_training_types as
                | { training_type_id: string }[]
                | null
        )?.some((r) => r.training_type_id === sessionTypeId);
        if (!hasTrainingType) {
            throw new Error("SESSION_NOT_BOOKABLE");
        }

        const { data: booking, error } = await supabase.rpc("create_booking", {
            p_user_id: userId,
            p_session_id: sessionId,
        });

        if (error) {
            throw new Error(mapBookingRpcError(error.message, error.code));
        }
        const row = Array.isArray(booking) ? booking[0] : booking;
        if (!row) throw new Error("Failed to create booking");

        return this.toModel(row);
    }

    async findById(id: string): Promise<BookingModel | null> {
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) return null;

        return this.toModel(data);
    }

    async list({ sessionId, userId, page, limit }: ListBookingsInput): Promise<{
        bookings: BookingModel[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const supabase = getSupabaseAdmin();
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from("bookings")
            .select("*", { count: "exact" })
            .order("booked_at", { ascending: false })
            .range(from, to);

        if (sessionId) query = query.eq("session_id", sessionId);
        if (userId) query = query.eq("user_id", userId);

        const { data, error, count } = await query;

        if (error) throw new Error(error.message);

        const bookings = (data ?? []).map((b) => this.toModel(b));
        const total = count ?? 0;

        return {
            bookings,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
        };
    }

    async cancel({
        bookingId,
        cancelReason = "Cancelled",
    }: CancelBookingInput): Promise<BookingModel> {
        const supabase = getSupabaseAdmin();

        const { data: current, error: findError } = await supabase
            .from("bookings")
            .select("id, status")
            .eq("id", bookingId)
            .maybeSingle();

        if (findError) throw new Error(findError.message);
        if (!current) throw new Error("BOOKING_NOT_FOUND");
        if (current.status !== "Confirmed" && current.status !== "WaitList") {
            throw new Error("BOOKING_NOT_ACTIVE");
        }

        const { data: booking, error } = await supabase
            .from("bookings")
            .update({
                status: "Cancelled",
                cancel_reason: cancelReason,
                canceled_at: new Date().toISOString(),
            })
            .eq("id", bookingId)
            .select()
            .single();

        if (error || !booking) {
            throw new Error(error?.message ?? "Failed to cancel booking");
        }

        return this.toModel(booking);
    }

    private toModel(booking: {
        id: string;
        user_id: string;
        session_id: string;
        status: BookingModel["status"];
        cancel_reason?: BookingCancelReason | null;
        booked_at: string;
        updated_at: string;
        canceled_at?: string | null;
    }): BookingModel {
        return new BookingModel({
            id: booking.id,
            userId: booking.user_id,
            sessionId: booking.session_id,
            status: booking.status,
            cancelReason: booking.cancel_reason as BookingCancelReason,
            bookedAt: new Date(booking.booked_at),
            updatedAt: new Date(booking.updated_at),
            canceledAt: booking.canceled_at
                ? new Date(booking.canceled_at)
                : new Date(0),
        });
    }
}