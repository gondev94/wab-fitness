import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { Role } from "../models/user.model.js";

export type JwtPayload = {
    sub: string;        // id del usuario
    email?: string;
    role: Role;
};

function getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Falta JWT_SECRET en .env");
    if (secret.length < 32) {
        throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
    }
    return secret;
}

export function signAccessToken(payload: JwtPayload): string {
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1h") as NonNullable<SignOptions["expiresIn"]>;

    return jwt.sign(payload, getSecret(), {
        algorithm: "HS256",
        expiresIn,
        issuer: "whataboutbalance",
        audience: "api",
    });
}

export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, getSecret(), {
        algorithms: ["HS256"],
        issuer: "whataboutbalance",
        audience: "api",
    }) as JwtPayload;
}