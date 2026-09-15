import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../plugins/jwt.plugin.js";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const payload = verifyAccessToken(token);
        const { data: profile } = await getSupabaseAdmin()
            .from("profiles")
            .select("id, email, role")
            .eq("id", payload.sub)
            .maybeSingle();
        if (!profile) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = {
            id: profile.id,
            email: profile.email,
            role: profile.role,
        };
        return next();
    } catch {
        return res.status(401).json({ message: "Invalid token or expired" });
    }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
    }
    return next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (token) {
        try {
            const payload = verifyAccessToken(token);
            const { data: profile } = await getSupabaseAdmin()
                .from("profiles")
                .select("id, email, role")
                .eq("id", payload.sub)
                .maybeSingle();
            if (profile) {
                req.user = {
                    id: profile.id,
                    email: profile.email,
                    role: profile.role,
                };
            }
        } catch {
            // token inválido → seguimos como invitado
        }
    }
    return next();
}