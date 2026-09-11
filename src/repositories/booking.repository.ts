import { BookingModel } from "../models/booking.model.js";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

export type CreateBookingInput = {
    userId: string;
    sessionId: string;
}


export class BookingRepository {
    async create({ userId, sessionId}: CreateBookingInput): Promise<BookingModel> {
        const supabase = getSupabaseAdmin();

        const {data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*, training_type:training_types(*)')
            .eq('id', sessionId)
            .maybeSingle();
        if (sessionError) throw new Error(sessionError.message);
        if (!session) throw new Error('Session not found');
        if (session.status !== 'Open') throw new Error('Session is not Open');


        const {data : existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .neq('Confirmed', 'WaitList')
            .maybeSingle();
        
        if(existing) throw new Error('User already has a booking for this session');

        const { count } = await supabase
            .from('bookings')
            .select('id', { count: 'exact' , head: true })
            .eq('session_id', sessionId)
            .eq('status', 'Confirmed');

        const maxCapacity = session.max_capacity ?? session.training_type?.max_capacity;
        const isFull = maxCapacity != null && (count ?? 0) >= maxCapacity;

        const { data: booking, error } = await supabase
            .from('bookings')
            .insert({
                user_id: userId,
                session_id: sessionId,
                status: isFull ? 'WaitList' : 'Confirmed',
            })
            .select()
            .single();
        if (error || !booking) throw new Error(error?.message ?? 'Failed to create booking');

        return new BookingModel({
            id: booking.id,
            userId: booking.user_id,
            sessionId: booking.session_id,
            status: booking.status,
            bookedAt: new Date(booking.booked_at),
            updatedAt: new Date(booking.updated_at),
            canceledAt: new Date(0),
        });
    }
}
