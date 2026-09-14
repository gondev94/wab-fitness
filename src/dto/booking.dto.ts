import type { BookingCancelReason } from "../models/booking.model.js";

export type CreateBookingBody = {
    userId?: string;
    sessionId?: string;
};

export type CancelBookingBody = {
    cancelReason?: BookingCancelReason;
};

export type ListBookingsQuery = {
    sessionId?: string;
    userId?: string;
    page?: string;
    limit?: string;
};