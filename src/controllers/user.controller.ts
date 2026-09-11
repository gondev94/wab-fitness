import type { Request, Response } from "express";
import { buildLogger } from "../plugins/logger.plugin.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { Role } from "../models/user.model.js";
import type { TrainingTypeSlug } from "../models/training.model.js";



export class UserController {
    private readonly logger = buildLogger("user.controller");

    constructor(private readonly userRepository: UserRepository) {}

    async create(req: Request, res: Response) {

        const VALID_TYPES: TrainingTypeSlug[] = ['Fuerza', 'Resistencia', 'Hipertrofia', 'Personalizado']
        const { email, password, username, role, trainingTypes } = req.body as {
            email?: string;
            password?: string;
            username?: string;
            role?: Exclude<Role, "admin">;
            trainingTypes?: TrainingTypeSlug[];
        };
        

        
        if (!email || !password || !username) {
            return res
            .status(400)
            .json({ message: "Email, Password and Username are required" });
        }
        
        if (password.length < 8) {
            return res
            .status(400)
            .json({ 
                message: "El password debe tener al menos 8 caracteres",
            });
        }
        
        if (role === "admin" as Role) {
            return res
            .status(400)
            .json({ message: "No se puede crear un usuario admin" });
        }
        
        if (role && role !== "user" && role !== "guest") {
            return res.status(400).json({ message: "Rol no válido" });
        }
        
        if (trainingTypes && (!Array.isArray(trainingTypes) || !trainingTypes.every((t)=> VALID_TYPES.includes(t)))) {
            return res
                .status(400)
                .json({ message: "Tipos de entrenamiento no válidos" });
        }
        try {
            const user = await this.userRepository.create({
                email,
                password,
                username,
                role: role as Exclude<Role, "admin">,
                trainingTypes: trainingTypes as TrainingTypeSlug[],
            });

            return res
                .status(201)
                .json({ message: "Usuario creado correctamente", user });
        } catch (error) {
            this.logger.error({ message: (error as Error).message });
            return res
                .status(500)
                .json({ message: "Error al crear el usuario" });
        }
    }

    async listAll(req: Request, res: Response) {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

        try {
            const { users, total, totalPages } = await this.userRepository.listAll(page, limit);
            res.status(200).json({
                users,
                total,
                totalPages,
                page,
                limit,
            });
        } catch (error) {
            this.logger.error({ message: (error as Error).message });
            return res.status(500).json({ message: "Error al obtener los usuarios" });
        }
    }

    async listTrainingTypes(req: Request, res: Response) {
        const VALID_TYPES: TrainingTypeSlug[] = ['Fuerza', 'Resistencia', 'Hipertrofia', 'Personalizado']
        const { training } = req.query as { training?: TrainingTypeSlug };

        if (!training || !VALID_TYPES.includes(training as TrainingTypeSlug)) {
            return res.status(400).json({ message: "Tipo de entrenamiento no válido" });
        }
        
        try {
            const users = await this.userRepository.listByTrainingType(training as TrainingTypeSlug);

            return res.status(200).json({
                training,
                total: users.length,
                users,
             });
        } catch (error) {
            this.logger.error({ message: (error as Error).message });
            return res.status(500).json({ message: "Error al obtener los alumnos" });
        }
    }
}
