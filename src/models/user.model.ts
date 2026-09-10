import type { TrainingTypeSlug } from "./training.model.js";

export type Role = "admin" | "user" | "guest";

export class UserModel {
    readonly id: string | number;
    email: string;
    role: Role;
    username: string;
    trainingTypes: TrainingTypeSlug[];
    createdAt: Date;
    updatedAt: Date;

    constructor({
        id,
        email,
        role,
        username,
        trainingTypes = [],
        createdAt,
        updatedAt,
    }: {
        id: string | number;
        email: string;
        role: Role;
        username: string;
        trainingTypes: TrainingTypeSlug[];
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.username = username;
        this.trainingTypes = trainingTypes;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
