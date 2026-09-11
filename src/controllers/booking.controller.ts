import type { Request, Response } from 'express';
import { BookingRepository } from '../repositories/booking.repository.js';
import { buildLogger } from '../plugins/logger.plugin.js';

export class BookingController {
    private readonly logger = buildLogger('booking.controller');

    constructor(private readonly bookingRepository: BookingRepository) {}

    async create(req: Request, res: Response) {
        const { userId, sessionId } = req.body as { userId: string; sessionId: string };

        if(!userId || !sessionId) {
            return res.status(400).json({ message: 'userId and sessionId are required' });
        }

        try {
            const booking = await this.bookingRepository.create({ userId, sessionId});
            return res.status(201).json({message: 'Booking created successfully', booking});
        } catch (error) { 
            this.logger.error({ message: (error as Error).message})            
            return res.status(400).json({ message: (error as Error).message });
        }
    }
}

