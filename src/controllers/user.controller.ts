import type { Request, Response } from 'express';
import { buildLogger } from '../plugins/logger.plugin.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { Role } from '../models/user.model.js';

export class UserController {
    private readonly logger = buildLogger('user.controller');
    
    constructor(private readonly userRepository: UserRepository) {}

    async create(req: Request, res: Response) {
        const { email, password, username, role } = req.params as {
            email?: string;
            password?: string;
            username?: string;
            role?: Exclude<Role, 'Admin'>;
        }

        if(!email || !password || !username) {
            return res.status(400).json({ message: 'Email, Password and Username are required' });
        }

        if(password.length < 8 ) {
            return res.status(400).json({ message: 'El password debe tener al menos 8 caracteres'})
        }

        if(role === 'admin') {
            return res.status(400).json({ message: 'No se puede crear un usuario admin'})
        }

        if(role && role !== 'user' && role !== 'guest') {
            return res.status(400).json({ message: 'Rol no válido'})
        }

        try {   
            const user = await this.userRepository.create({
                email,
                password,
                username,
                role: role as Role,
            });

            return res.status(201).json({ message: 'Usuario creado correctamente', user });
        } catch (error) {
            this.logger.error({message: (error as Error).message})
            return res.status(500).json({ message: 'Error al crear el usuario' });
        }

    }
}