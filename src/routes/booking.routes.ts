import type { Request, Response } from 'express';
import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller.js';
import { BookingRepository } from '../repositories/booking.repository.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware.js';

const bookingController = new BookingController(new BookingRepository());
const router = Router();

router.post('/', requireAuth, requireAdmin, (req, res) => bookingController.create(req, res));

export default router;