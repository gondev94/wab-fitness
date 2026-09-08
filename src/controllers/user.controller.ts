import type { Request, Response } from 'express';
import { buildLogger } from '../plugins/logger.plugin.js';
import { UserRepository } from '../repositories/user.repository.js';

export class UserController {
    private readonly logger = buildLogger('user.controller');
    
    constructor(private readonly userRepository: UserRepository) {}

    
}