import type { Request, Response, NextFunction } from "express";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

// capa 1 quiern eres? jwt de supabase

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data.user) {
        return res.status(401).json({ message: "Invalid token or expired" });
    }

    req.user = { id: String(data.user.id), email: String(data.user.email) };
    next();
}

//capa 2: ¿eres admin? se consulta profiles no el token

export async function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { data: profile, error } = await getSupabaseAdmin()
        .from("profiles")
        .select("role")
        .eq("id", req.user.id)
        .single();
    
    if (error || profile?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    req.user.role = profile.role;
    next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if(!token) {
        return next();
    }

    const {data, error} = await getSupabaseAdmin().auth.getUser(token);
    if(!error && data.user) {
        req.user = {id: data.user.id, email: data.user.email};
    }

    next();
}


