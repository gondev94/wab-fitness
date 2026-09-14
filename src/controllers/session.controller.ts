import type { Request, Response } from 'express';
import { buildLogger } from '../plugins/logger.plugin.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { SESSION_STATUSES, SESSION_VISIBILITIES } from '../models/session.model.js';
import type { CreateSessionBody, UpdateSessionBody } from '../dto/session.dto.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Errores del repo que el cliente puede ver (no filtran nada de Supabase)
const NOT_FOUND_ERRORS = new Set(['SESSION_NOT_FOUND', 'TRAINING_TYPE_NOT_FOUND']);
const BAD_REQUEST_ERRORS = new Set([
    'TRAINING_TYPE_INACTIVE',
    'SESSION_ALREADY_CANCELLED',
]);

export class SessionController {
    private readonly logger = buildLogger('session.controller');

    constructor(private readonly sessionRepository: SessionRepository) {}

    async list(req: Request, res: Response) {
        const { from, to } = req.query as { from?: string; to?: string };

        if (!from || !to || !DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
            return res.status(400).json({ message: 'Formato de fecha inválido. Debe ser YYYY-MM-DD' });
        }

        if (from > to) {
            return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin' });
        }

        try {
            const sessions = await this.sessionRepository.findByDateRange({
                from,
                to,
                includeMemberSessions: Boolean(req.user),
            });
            return res.status(200).json(sessions);
        } catch (error) {
            this.logger.error({ message: (error as Error).message });
            return res.status(500).json({ message: 'Error al obtener las sesiones' });
        }
    }

    async getById(req: Request, res: Response) {
        const { id } = req.params;

        if (!id || !UUID_REGEX.test(id as string)) {
            return res.status(400).json({ message: 'ID no válido' });
        }

        try {
            const session = await this.sessionRepository.findById(id as string);
            if (!session) {
                return res.status(404).json({ message: 'Sesión no encontrada' });
            }

            // Sesión de miembros: no revelar a invitados que existe
            if (session.visibility === 'Member' && !req.user) {
                return res.status(404).json({ message: 'Sesión no encontrada' });
            }

            return res.status(200).json(session);
        } catch (error) {
            this.logger.error({ message: (error as Error).message });
            return res.status(500).json({ message: 'Error al obtener la sesión' });
        }
    }

    async create(req: Request, res: Response) {
        const body = req.body as CreateSessionBody;

        const {
            trainingTypeId,
            date,
            startTime,
            endTime,
            maxCapacity,
            status,
            visibility,
            blockedReason,
            priorityOpensAt,
            generalOpensAt,
        } = body;

        if (!trainingTypeId || !UUID_REGEX.test(trainingTypeId)) {
            return res.status(400).json({ message: 'trainingTypeId no válido' });
        }

        if (!date || !DATE_REGEX.test(date)) {
            return res.status(400).json({ message: 'date debe ser YYYY-MM-DD' });
        }

        if (!startTime || !TIME_REGEX.test(startTime) || !endTime || !TIME_REGEX.test(endTime)) {
            return res.status(400).json({ message: 'startTime y endTime deben ser HH:MM' });
        }

        if (startTime >= endTime) {
            return res.status(400).json({ message: 'startTime debe ser anterior a endTime' });
        }

        if (maxCapacity !== undefined && (!Number.isInteger(maxCapacity) || maxCapacity < 1 || maxCapacity > 100)) {
            return res.status(400).json({ message: 'maxCapacity debe ser un entero entre 1 y 100' });
        }

        if (status !== undefined && !SESSION_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'status no válido' });
        }

        if (visibility !== undefined && !SESSION_VISIBILITIES.includes(visibility)) {
            return res.status(400).json({ message: 'visibility no válida' });
        }

        try {
            const session = await this.sessionRepository.create({
                trainingTypeId,
                date,
                startTime,
                endTime,
                maxCapacity,
                status,
                visibility,
                blockedReason: blockedReason?.slice(0, 200),
                priorityOpensAt,
                generalOpensAt,
            });
            return res.status(201).json({ message: 'Sesión creada correctamente', session });
        } catch (error) {
            return this.handleError(res, error, 'Error al crear la sesión');
        }
    }

    async update(req: Request, res: Response) {
        const { id } = req.params;
        const body = req.body as UpdateSessionBody;

        if (!id || !UUID_REGEX.test(id as string)) {
            return res.status(400).json({ message: 'ID no válido' });
        }

        const {
            date,
            startTime,
            endTime,
            maxCapacity,
            status,
            visibility,
            blockedReason,
            priorityOpensAt,
            generalOpensAt,
        } = body;

        if (
            date === undefined && startTime === undefined && endTime === undefined &&
            maxCapacity === undefined && status === undefined && visibility === undefined &&
            blockedReason === undefined && priorityOpensAt === undefined && generalOpensAt === undefined
        ) {
            return res.status(400).json({ message: 'No hay cambios para actualizar' });
        }

        if (date !== undefined && !DATE_REGEX.test(date)) {
            return res.status(400).json({ message: 'date debe ser YYYY-MM-DD' });
        }

        if (startTime !== undefined && !TIME_REGEX.test(startTime)) {
            return res.status(400).json({ message: 'startTime debe ser HH:MM' });
        }

        if (endTime !== undefined && !TIME_REGEX.test(endTime)) {
            return res.status(400).json({ message: 'endTime debe ser HH:MM' });
        }

        if (startTime !== undefined && endTime !== undefined && startTime >= endTime) {
            return res.status(400).json({ message: 'startTime debe ser anterior a endTime' });
        }

        if (maxCapacity !== undefined && (!Number.isInteger(maxCapacity) || maxCapacity < 1 || maxCapacity > 100)) {
            return res.status(400).json({ message: 'maxCapacity debe ser un entero entre 1 y 100' });
        }

        if (status !== undefined && !SESSION_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'status no válido' });
        }

        if (visibility !== undefined && !SESSION_VISIBILITIES.includes(visibility)) {
            return res.status(400).json({ message: 'visibility no válida' });
        }

        try {
            const session = await this.sessionRepository.update(id as string, {
                date,
                startTime,
                endTime,
                maxCapacity,
                status,
                visibility,
                blockedReason: blockedReason?.slice(0, 200),
                priorityOpensAt,
                generalOpensAt,
            });
            return res.status(200).json({ message: 'Sesión actualizada correctamente', session });
        } catch (error) {
            return this.handleError(res, error, 'Error al actualizar la sesión');
        }
    }

    async cancel(req: Request, res: Response) {
        const { id } = req.params;

        if (!id || !UUID_REGEX.test(id as string)) {
            return res.status(400).json({ message: 'ID no válido' });
        }

        try {
            const session = await this.sessionRepository.cancel(id as string);
            return res.status(200).json({ message: 'Sesión cancelada correctamente', session });
        } catch (error) {
            return this.handleError(res, error, 'Error al cancelar la sesión');
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