import type { TrainingModel, TrainingTypeSlug } from "./training.model.js";

export type SlotDisplayStatus = 'Available' | 'PriorityOnly' | 'Blocked' | 'Full' | 'Booked';

export class ContactFormDataMode{
    name: string;
    email: string;
    phone?: string | undefined;
    training: TrainingTypeSlug;
    addMealPlan: boolean;
    message?: string | undefined;

    constructor({name, email, phone, training, addMealPlan, message}:{
        name: string;
        email: string;
        phone?: string;
        training: TrainingTypeSlug;
        addMealPlan: boolean;
        message?: string;
    }) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.training = training;
        this.addMealPlan = addMealPlan;
        this.message = message;
    }

}