import type { Request, Response } from 'express';
import { buildLogger } from '../plugins/logger.plugin.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { SESSION_STATUSES, SESSION_VISIBILITIES } from '../models/session.model.js';
import type { CreateSessionBody, ListSessionsQuery, UpdateSessionBody } from '../dto/session.dto.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
const MAX_RANGE_DAYS = 90;

const NOT_FOUND_ERRORS = new Set(['SESSION_NOT_FOUND', 'TRAINING_TYPE_NOT_FOUND']);
const BAD_REQUEST_ERRORS = new Set([
    'TRAINING_TYPE_INACTIVE',
    'SESSION_ALREADY_CANCELLED',
]);

function isValidDate(value: string): boolean {
    if (!DATE_REGEX.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year as number, (month as number) - 1, day as number);
    return (
        parsed.getFullYear() === year &&
        parsed.getMonth() === (month as number) - 1 &&
        parsed.getDate() === day
    );
}

function isValidTime(value: string): boolean {
    if (!TIME_REGEX.test(value)) return false;
    const [hours, minutes] = value.split(':').map(Number);
    return (hours as number) >= 0 && (hours as number) <= 23
        && (minutes as number) >= 0 && (minutes as number) <= 59;
}

function isValidIsoDateTime(value: string): boolean {
    if (!ISO_REGEX.test(value)) return false;
    return !Number.isNaN(Date.parse(value));
}

function daysBetween(from: string, to: string): number {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export class SessionController {
    private readonly logger = buildLogger('session.controller');

    constructor(private readonly sessionRepository: SessionRepository) {}

    async list(req: Request, res: Response) {
        const { from, to } = req.query as ListSessionsQuery;

        if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
            return res.status(400).json({ message: 'Formato de fecha inválido. Debe ser YYYY-MM-DD' });
        }

        if (from > to) {
            return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin' });
        }

        if (daysBetween(from, to) > MAX_RANGE_DAYS) {
            return res.status(400).json({ message: `El rango no puede superar ${MAX_RANGE_DAYS} días` });
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

        if (!date || !isValidDate(date)) {
            return res.status(400).json({ message: 'date debe ser YYYY-MM-DD' });
        }

        if (!startTime || !isValidTime(startTime) || !endTime || !isValidTime(endTime)) {
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

        if (blockedReason !== undefined && typeof blockedReason !== 'string') {
            return res.status(400).json({ message: 'blockedReason no válido' });
        }

        if (priorityOpensAt !== undefined && !isValidIsoDateTime(priorityOpensAt)) {
            return res.status(400).json({ message: 'priorityOpensAt debe ser ISO 8601' });
        }

        if (generalOpensAt !== undefined && !isValidIsoDateTime(generalOpensAt)) {
            return res.status(400).json({ message: 'generalOpensAt debe ser ISO 8601' });
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

        if (date !== undefined && !isValidDate(date)) {
            return res.status(400).json({ message: 'date debe ser YYYY-MM-DD' });
        }

        if (startTime !== undefined && !isValidTime(startTime)) {
            return res.status(400).json({ message: 'startTime debe ser HH:MM' });
        }

        if (endTime !== undefined && !isValidTime(endTime)) {
            return res.status(400).json({ message: 'endTime debe ser HH:MM' });
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

        if (blockedReason !== undefined && typeof blockedReason !== 'string') {
            return res.status(400).json({ message: 'blockedReason no válido' });
        }

        if (priorityOpensAt !== undefined && !isValidIsoDateTime(priorityOpensAt)) {
            return res.status(400).json({ message: 'priorityOpensAt debe ser ISO 8601' });
        }

        if (generalOpensAt !== undefined && !isValidIsoDateTime(generalOpensAt)) {
            return res.status(400).json({ message: 'generalOpensAt debe ser ISO 8601' });
        }

        try {
            if (startTime !== undefined || endTime !== undefined) {
                const existing = await this.sessionRepository.findById(id as string);
                if (!existing) {
                    return res.status(404).json({ message: 'Sesión no encontrada' });
                }
                const nextStart = startTime ?? existing.startTime;
                const nextEnd = endTime ?? existing.endTime;
                if (nextStart >= nextEnd) {
                    return res.status(400).json({ message: 'startTime debe ser anterior a endTime' });
                }
            }

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