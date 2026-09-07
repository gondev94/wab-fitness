import type { SessionVisibility } from "./session.model.js";
import type { TrainingModel } from "./training.model.js";

export class ScheduledTemplateModel {
    readonly id: string;
    trainingTypeId: string;
    trainingType: TrainingModel;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    maxCapacity: number;
    visibility: SessionVisibility;
    isActive: boolean;
    
    constructor({ id, trainingTypeId, trainingType, dayOfWeek, startTime, endTime, maxCapacity, visibility, isActive}: {
        id: string;
        trainingTypeId: string;
        trainingType: TrainingModel;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        maxCapacity: number;
        visibility: SessionVisibility;
        isActive: boolean;
    }) {
        this.id = id;
        this.trainingTypeId = trainingTypeId;
        this.trainingType = trainingType;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.maxCapacity = maxCapacity;
        this.visibility = visibility;
        this.isActive = isActive;
    }
}