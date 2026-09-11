import type { Role } from "../models/user.model.js";
import type { TrainingTypeSlug } from "../models/training.model.js";

export type CreateUserBody = {
    email?: string;
    password?: string;
    username?: string;
    role?: Exclude<Role, "admin">;
    trainingTypes?: TrainingTypeSlug[];
};


export type UpdateUserBody = {
    email?: string;
    username?: string;
    trainingTypes?: TrainingTypeSlug[];
};


export type ListTrainingTypesQuery = {
    training?: TrainingTypeSlug;
};
