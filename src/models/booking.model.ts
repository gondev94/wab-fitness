import type { SessionModel } from "./session.model.js";
import type { UserModel } from "./user.model.js";

export type BookingStatus = 'Confirmed' | 'WaitList' | 'Cancelled' | 'NoShow';

export class BookingModel {
    readonly id: string;
    userId: string;
    sessionId: string;
    session?: SessionModel | undefined;
    profile?: UserModel | undefined;
    status: BookingStatus;
    bookedAt: Date;
    updatedAt: Date;
    canceledAt: Date;

    constructor({ id, userId, sessionId, session, profile, status, bookedAt, updatedAt, canceledAt}: {
        id: string;
        userId: string;
        sessionId: string;
        session?: SessionModel;
        profile?: UserModel;
        status: BookingStatus;
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
        this.bookedAt = bookedAt;
        this.updatedAt = updatedAt;
        this.canceledAt = canceledAt;
    }
}