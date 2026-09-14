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

        // Solo se puede reservar a un usuario con rol "user"
        const { data: profile } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", userId)
            .maybeSingle();

        if (!profile) throw new Error("USER_NOT_FOUND");
        if (profile.role !== "user") throw new Error("USER_NOT_BOOKABLE");

        const { data: existing } = await supabase
            .from("bookings")
            .select("id")
            .eq("session_id", sessionId)
            .eq("user_id", userId)
            .in("status", ["Confirmed", "WaitList"])
            .maybeSingle();

        if (existing) throw new Error("DUPLICATE_BOOKING");

        const { count } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("session_id", sessionId)
            .eq("status", "Confirmed");

        const maxCapacity =
            session.max_capacity ?? session.training_type?.max_capacity;
        const isFull = maxCapacity != null && (count ?? 0) >= maxCapacity;

        const { data: booking, error } = await supabase
            .from("bookings")
            .insert({
                user_id: userId,
                session_id: sessionId,
                status: isFull ? "WaitList" : "Confirmed",
            })
            .select()
            .single();

        if (error) {
            if ((error as { code?: string }).code === "23505") {
                throw new Error("DUPLICATE_BOOKING");
            }
            throw new Error(error.message);
        }
        if (!booking) throw new Error("Failed to create booking");

        return this.toModel(booking);
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