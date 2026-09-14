import type {
    SessionStatus,
    SessionVisibility,
} from "../models/session.model.js";

export type ListSessionsQuery = {
    from?: string;
    to?: string;
};

export type CreateSessionBody = {
    trainingTypeId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    maxCapacity?: number;
    status?: SessionStatus;
    visibility?: SessionVisibility;
    blockedReason?: string;
    priorityOpensAt?: string;
    generalOpensAt?: string;
};

export type UpdateSessionBody = {
    date?: string;
    startTime?: string;
    endTime?: string;
    maxCapacity?: number;
    status?: SessionStatus;
    visibility?: SessionVisibility;
    blockedReason?: string;
    priorityOpensAt?: string;
    generalOpensAt?: string;
};
