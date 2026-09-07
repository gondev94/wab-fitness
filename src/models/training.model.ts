export type TrainingTypeSlug = 'Fuerza' | 'Resistencia' | 'Hipertrofia' | 'Personalizado';

export class TrainingModel {
    readonly id: string;
    name: string;
    slug: TrainingTypeSlug;
    description: string;
    durationMinutes: number;
    maxCapacity: number;
    color: string;
    icon: string;
    isActive: boolean;
    createdAt: Date;

    constructor({ id, name, slug, description, durationMinutes, maxCapacity, color, icon, isActive, createdAt} : {
        id: string;
        name: string;
        slug: TrainingTypeSlug;
        description: string;
        durationMinutes: number;
        maxCapacity: number;
        color: string;
        icon: string;
        isActive: boolean;
        createdAt: Date;
    }) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.durationMinutes = durationMinutes;
        this.maxCapacity = maxCapacity;
        this.color = color;
        this.icon = icon;
        this.isActive = isActive;
        this.createdAt = createdAt;
    }
}
