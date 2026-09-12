import type { SessionModel } from "./session.model.js";
import type { UserModel } from "./user.model.js";

export type BookingStatus = 'Confirmed' | 'WaitList' | 'Cancelled' | 'NoShow';
export type BookingCancelReason = 'Cancelled' | 'RescheduleRequested';  


export class BookingModel {
    readonly id: string;
    userId: string;
    sessionId: string;
    session?: SessionModel | undefined;
    profile?: UserModel | undefined;
    status: BookingStatus;
    cancelReason?: BookingCancelReason | undefined;
    bookedAt: Date;
    updatedAt: Date;
    canceledAt: Date;

    constructor({ id, userId, sessionId, session, profile, status, cancelReason, bookedAt, updatedAt, canceledAt}: {
        id: string;
        userId: string;
        sessionId: string;
        session?: SessionModel;
        profile?: UserModel;
        status: BookingStatus;
        cancelReason?: BookingCancelReason;
        bookedAt: Date;
        updatedAt: Date;
        canceledAt: Date;
    }) {
        this.id = id;
        this.userId = userId;
        this.sessionId = sessionId;
        this.session = session;
        this.profile = profile;
        this.status = status;
        this.cancelReason = cancelReason;
        this.bookedAt = bookedAt;
        this.updatedAt = updatedAt;
        this.canceledAt = canceledAt;
    }
}