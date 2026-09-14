import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller.js';
import { BookingRepository } from '../repositories/booking.repository.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const bookingController = new BookingController(new BookingRepository());
const router = Router();

router.post('/', requireAuth, (req, res) => bookingController.create(req, res));
router.get('/', requireAuth, (req, res) => bookingController.list(req, res));
router.get('/:id', requireAuth, (req, res) => bookingController.getById(req, res));
router.put('/:id', requireAuth, (req, res) => bookingController.cancel(req, res));



export default router;