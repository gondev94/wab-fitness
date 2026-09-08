import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware.js';
import { UserRepository } from '../repositories/user.repository.js';

const userController = new UserController(new UserRepository());
const router = Router();

router.post('/', requireAuth, requireAdmin, (req, res) => userController.create(req, res));


export default router;
