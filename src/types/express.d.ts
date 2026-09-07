import type { Role } from "../models/user.model.js";

declare global {
    namespace Express{
        interface Request {
            user?: {
                id: string;
                email?: string;
                role?: Role
            }
        }
    }
}

export {};
