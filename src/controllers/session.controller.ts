import type { Request, Response } from 'express';
import { buildLogger } from '../plugins/logger.plugin.js';
import { SessionRepository } from '../repositories/session.repository.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class SessionController {
    private readonly logger = buildLogger('session.controller');

    constructor(private readonly sessionRepository: SessionRepository) {}

    async list(req: Request, res: Response) {
        const { from, to } = req.query as { from?: string; to?: string};

        if(!from || !to || !DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
            return res.status(400).json({ message: 'Formato de fecha inválido. Debe ser YYYY-MM-DD'})
        }

        if(from > to) {
            return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin'})
        }

        try {
            const sessions = await this.sessionRepository.findByDateRange({
                from,
                to,
                includeMemberSessions: Boolean(req.user),
            });

            return res.status(200).json(sessions);
        } catch (error) {
            this.logger.error({message: (error as Error).message});
            return res.status(500).json({ message: 'Error al obtener las sesiones' });
        }
    }
}