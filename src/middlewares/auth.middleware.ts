import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../plugins/jwt.plugin.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
        return next();
    } catch {
        return res.status(401).json({ message: "Invalid token or expired" });
    }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
    }
    return next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (token) {
        try {
            const payload = verifyAccessToken(token);
            req.user = { id: payload.sub, email: payload.email, role: payload.role };
        } catch {
            // token inválido → seguimos como invitado
        }
    }
    return next();
}