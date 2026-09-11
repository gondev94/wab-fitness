import type { Request, Response } from "express";
import { buildLogger } from "../plugins/logger.plugin.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { Role } from "../models/user.model.js";
import { TRAINING_TYPE_SLUGS, type TrainingTypeSlug } from "../models/training.model.js";
import type { CreateUserBody, UpdateUserBody, ListTrainingTypesQuery } from "../dto/user.dto.js";



export class UserController {
    private readonly logger = buildLogger("user.controller");

    constructor(private readonly userRepository: UserRepository) {}

    async create(req: Request, res: Response) {

        const { email, password, username, role, trainingTypes } = req.body as CreateUserBody;       
        
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
        
        if (trainingTypes && (!Array.isArray(trainingTypes) || !trainingTypes.every((t)=> TRAINING_TYPE_SLUGS.includes(t)))) {
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

    async update(req: Request, res: Response) {
        const { id } = req.params;
        const { email, username, trainingTypes } = req.body as UpdateUserBody;

        if (!id) {
            return res.status(400).json({ message: "ID is required" });
        }

        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ message: "Email is not valid" });
        }

        if(email === undefined && username === undefined && trainingTypes === undefined) {
            return res.status(400).json({ message: "Not changes to update" });
        }

        if(trainingTypes && (!Array.isArray(trainingTypes) || !trainingTypes.every((t) => TRAINING_TYPE_SLUGS.includes(t)))) {
            return res.status(400).json({ message: "Training types are not valid" });
        }

        try {
            const existing = await this.userRepository.findById(id as string);
            if(!existing) {
                return res.status(404).json({ message: "User not found" });
            }
            const user = await this.userRepository.update(id as string, { 
                email: email as string, 
                username: username as string, 
                trainingTypes: trainingTypes as TrainingTypeSlug[] 
            });

            return res.status(200).json({ message: "User updated correctly", user });
        } catch (error) {
            this.logger.error({ message: (error as Error).message });
            return res.status(500).json({ message: "Error al actualizar el usuario" });
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
        const { training } = req.query as ListTrainingTypesQuery;

        if (!training || !TRAINING_TYPE_SLUGS.includes(training as TrainingTypeSlug)) {
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
