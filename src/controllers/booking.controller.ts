import type { Request, Response } from 'express';
import { BookingRepository } from '../repositories/booking.repository.js';
import { buildLogger } from '../plugins/logger.plugin.js';
import { BOOKING_CANCEL_REASONS } from '../models/booking.model.js';
import type { CreateBookingBody, CancelBookingBody, ListBookingsQuery } from '../dto/booking.dto.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NOT_FOUND_ERRORS = new Set(['SESSION_NOT_FOUND', 'USER_NOT_FOUND', 'BOOKING_NOT_FOUND']);
const BAD_REQUEST_ERRORS = new Set([
    'SESSION_NOT_OPEN',
    'DUPLICATE_BOOKING',
    'BOOKING_NOT_ACTIVE',
    'USER_NOT_BOOKABLE',
]);

export class BookingController {
    private readonly logger = buildLogger('booking.controller');

    constructor(private readonly bookingRepository: BookingRepository) {}

    async create(req: Request, res: Response) {
        const body = req.body as CreateBookingBody;
        const { sessionId } = body;

        if (!sessionId || !UUID_REGEX.test(sessionId)) {
            return res.status(400).json({ message: 'sessionId no válido' });
        }

        // El alumno solo se reserva a sí mismo; el admin puede indicar otro userId
        const isAdmin = req.user?.role === 'admin';
        const userId = isAdmin && body.userId ? body.userId : req.user?.id;

        if (!userId || !UUID_REGEX.test(userId)) {
            return res.status(400).json({ message: 'userId no válido' });
        }

        try {
            const booking = await this.bookingRepository.create({ userId, sessionId });
            return res.status(201).json({ message: 'Reserva creada correctamente', booking });
        } catch (error) {
            return this.handleError(res, error, 'Error al crear la reserva');
        }
    }

    async list(req: Request, res: Response) {
        const query = req.query as ListBookingsQuery;
        const isAdmin = req.user?.role === 'admin';

        // El alumno solo ve lo suyo; el admin puede filtrar por cualquiera
        const userId = isAdmin ? query.userId : req.user?.id;
        const sessionId = query.sessionId;

        if (sessionId && !UUID_REGEX.test(sessionId)) {
            return res.status(400).json({ message: 'sessionId no válido' });
        }
        if (userId && !UUID_REGEX.test(userId)) {
            return res.status(400).json({ message: 'userId no válido' });
        }

        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

        try {
            const result = await this.bookingRepository.list({ sessionId, userId, page, limit });
            return res.status(200).json(result);
        } catch (error) {
            this.logger.error({ message: (error as Error).message });
            return res.status(500).json({ message: 'Error al obtener las reservas' });
        }
    }

    async getById(req: Request, res: Response) {
        const { id } = req.params;

        if (!id || !UUID_REGEX.test(id as string)) {
            return res.status(400).json({ message: 'ID no válido' });
        }

        try {
            const booking = await this.bookingRepository.findById(id as string);
            if (!booking) {
                return res.status(404).json({ message: 'Reserva no encontrada' });
            }

            // No admin: solo su propia reserva (404 para no revelar que existe)
            if (req.user?.role !== 'admin' && booking.userId !== req.user?.id) {
                return res.status(404).json({ message: 'Reserva no encontrada' });
            }

            return res.status(200).json(booking);
        } catch (error) {
            this.logger.error({ message: (error as Error).message });
            return res.status(500).json({ message: 'Error al obtener la reserva' });
        }
    }

    async cancel(req: Request, res: Response) {
        const { id } = req.params;
        const { cancelReason } = req.body as CancelBookingBody;

        if (!id || !UUID_REGEX.test(id as string)) {
            return res.status(400).json({ message: 'ID no válido' });
        }

        if (cancelReason !== undefined && !BOOKING_CANCEL_REASONS.includes(cancelReason)) {
            return res.status(400).json({ message: 'cancelReason no válido' });
        }

        try {
            // Comprobar propiedad antes de cancelar
            const existing = await this.bookingRepository.findById(id as string);
            if (!existing) {
                return res.status(404).json({ message: 'Reserva no encontrada' });
            }
            if (req.user?.role !== 'admin' && existing.userId !== req.user?.id) {
                return res.status(404).json({ message: 'Reserva no encontrada' });
            }

            const booking = await this.bookingRepository.cancel({
                bookingId: id as string,
                cancelReason: cancelReason ?? 'Cancelled',
            });
            return res.status(200).json({ message: 'Reserva cancelada correctamente', booking });
        } catch (error) {
            return this.handleError(res, error, 'Error al cancelar la reserva');
        }
    }

    private handleError(res: Response, error: unknown, fallback: string) {
        const code = (error as Error).message;
        this.logger.error({ message: code });

        if (NOT_FOUND_ERRORS.has(code)) {
            return res.status(404).json({ message: code });
        }
        if (BAD_REQUEST_ERRORS.has(code)) {
            return res.status(400).json({ message: code });
        }
        return res.status(500).json({ message: fallback });
    }
}