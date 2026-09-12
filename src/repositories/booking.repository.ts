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
