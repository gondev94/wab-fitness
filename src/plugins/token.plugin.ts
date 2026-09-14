import { randomBytes, createHash } from "crypto";

export function generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString("hex");
    const hash = hashRefreshToken(token);
    return { token, hash };
}

export function hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}