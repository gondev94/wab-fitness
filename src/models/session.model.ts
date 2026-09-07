import type { TrainingModel } from "./training.model.js";

export type SessionStatus = 'Open' | 'Closed' | 'Blocked' | 'Cancelled';
export type SessionVisibility = 'Public' | 'Member';

export class SessionModel {
    readonly id: string;
    trainingTypeId: string;
    trainingType: TrainingModel | undefined;
    date: Date;
    startTime: string;
    endTime: string;
    maxCapacity?: number | undefined;
    currentBookings?: number | undefined;
    status: SessionStatus;
    visibility: SessionVisibility;
    blockedReason?: string | undefined;
    priorityOpensAt?: Date | undefined;
    generalOpensAt?: Date | undefined;
    createdAt: Date;
    updatedAt: Date;            

    constructor({ id, trainingTypeId, trainingType, date, startTime, endTime, maxCapacity, currentBookings, status, visibility, blockedReason, priorityOpensAt, generalOpensAt, createdAt, updatedAt} : {
        id: string;
        trainingTypeId: string;
        trainingType: TrainingModel | undefined;
        date: Date;
        startTime: string;
        endTime: string;
        maxCapacity?: number;
        currentBookings?: number;
        status: SessionStatus;
        visibility: SessionVisibility;
        blockedReason?: string ;
        priorityOpensAt?: Date;
        generalOpensAt?: Date;
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = id;
        this.trainingTypeId = trainingTypeId;
        this.trainingType = trainingType;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.maxCapacity = maxCapacity;
        this.currentBookings = currentBookings;
        this.status = status;
        this.visibility = visibility;
        this.blockedReason = blockedReason;
        this.priorityOpensAt = priorityOpensAt;
        this.generalOpensAt = generalOpensAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}