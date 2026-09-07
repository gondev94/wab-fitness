export type TrainingTypeSlug = 'Fuerza' | 'Resistencia' | 'Hipertrofia' | 'Personalizado';

export class TrainingModel {
    readonly id: string;
    name: string;
    slug: TrainingTypeSlug;
    description: string;
    duration_minutes: number;
    max_capacity: number;
    color: string;
    icon: string;
    is_active: boolean;
    createdAt: Date;

    constructor({ id, name, slug, description, duration_minutes, max_capacity, color, icon, is_active, createdAt} : {
        id: string;
        name: string;
        slug: TrainingTypeSlug;
        description: string;
        duration_minutes: number;
        max_capacity: number;
        color: string;
        icon: string;
        is_active: boolean;
        createdAt: Date;
    }) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.duration_minutes = duration_minutes;
        this.max_capacity = max_capacity;
        this.color = color;
        this.icon = icon;
        this.is_active = is_active;
        this.createdAt = createdAt;
    }
}
