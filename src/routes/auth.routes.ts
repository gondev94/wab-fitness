import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const authController = new AuthController();
const router = Router();

router.post('/login', (req, res) => authController.login(req, res));

export default router;