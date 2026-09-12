import type { Request, Response } from 'express';
import { BookingRepository } from '../repositories/booking.repository.js';
import { buildLogger } from '../plugins/logger.plugin.js';
import type { BookingCancelReason } from '../models/booking.model.js';


const CANCEL_REASONS: BookingCancelReason[] = ["Cancelled", "RescheduleRequested"];

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

    async cancel(req: Request, res: Response) {
        const { id } = req.params;
        const { cancelReason } = req.body as { cancelReason?: BookingCancelReason };

        if(!id) {
            return res.status(400).json({ message: 'ID is required'});
        }

        if(cancelReason && !CANCEL_REASONS.includes(cancelReason)) {
            return res.status(400).json({ message: "cancelReason must be Cancelled or RescheduleRequested"})
        }

        try {
            const booking = await this.bookingRepository.cancel({
                bookingId: id as string,
                cancelReason: cancelReason ?? "Cancelled" 
            });
            return res.status(200).json({ message: 'Booking cancelled successfully', booking});
        } catch (error) {
            this.logger.error({ message: (error as Error).message})            
            return res.status(400).json({ message: (error as Error).message });
        }

    }
}

