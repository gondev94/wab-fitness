import type { Request, Response } from "express";
import { buildLogger } from "../plugins/logger.plugin.js";
import {
    getSupabaseAnon,
    getSupabaseAdmin,
} from "../plugins/supabase.plugin.js";
import { signAccessToken } from "../plugins/jwt.plugin.js";
import type { LoginBody } from "../dto/auth.dto.js";
import type { Role } from "../models/user.model.js";

export class AuthController {
    private readonly logger = buildLogger("auth.controller");

    async login(req: Request, res: Response) {
        const { email, password } = req.body as LoginBody;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email y password son requeridos" });
        }

        try {
            // 1) Verificar credenciales contra Supabase (única vez)
            const { data, error } =
                await getSupabaseAnon().auth.signInWithPassword({
                    email,
                    password,
                });

            if (error || !data.user) {
                return res
                    .status(401)
                    .json({ message: "Credenciales inválidas" });
            }

            // 2) Traer el rol de profiles (una vez, en login)
            const { data: profile } = await getSupabaseAdmin()
                .from("profiles")
                .select("role")
                .eq("id", data.user.id)
                .single();

            const role = (profile?.role ?? "guest") as Role;

            // 3) Firmar TU token
            const token = signAccessToken({
                sub: data.user.id,
                email: data.user.email ?? "",
                role,
            });

            return res.status(200).json({ message: "Login successful", token });
        } catch (err) {
            this.logger.error({ message: (err as Error).message });
            return res.status(500).json({ message: "Error al iniciar sesión" });
        }
    }
}
