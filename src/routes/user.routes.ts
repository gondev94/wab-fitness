import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware.js';
import { UserRepository } from '../repositories/user.repository.js';

const userController = new UserController(new UserRepository());
const router = Router();

router.post('/', requireAuth, requireAdmin, (req, res) => userController.create(req, res));
router.put('/:id', requireAuth, requireAdmin, (req, res) => userController.update(req, res));
router.get('/', requireAuth, requireAdmin, (req, res) => userController.listAll(req, res));
router.get('/training-types', requireAuth, requireAdmin, (req, res) => userController.listTrainingTypes(req, res));


export default router;
