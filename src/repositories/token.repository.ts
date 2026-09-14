import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

export type RefreshTokenRow = {
    id: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
};

export class TokenRepository {
    async store(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from("refresh_tokens").insert({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
        });
        if (error) throw new Error(error.message);
    }

    async findValidByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
            .from("refresh_tokens")
            .select("id, user_id, expires_at, revoked_at")
            .eq("token_hash", tokenHash)
            .maybeSingle();

        if (!data) return null;
        if (data.revoked_at) return null;
        if (new Date(data.expires_at) < new Date()) return null;

        return {
            id: data.id,
            userId: data.user_id,
            expiresAt: new Date(data.expires_at),
            revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
        };
    }

    async revoke(id: string): Promise<void> {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from("refresh_tokens")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", id);
        if (error) throw new Error(error.message);
    }

    async revokeAllForUser(userId: string): Promise<void> {
        const supabase = getSupabaseAdmin();
        await supabase
            .from("refresh_tokens")
            .update({ revoked_at: new Date().toISOString() })
            .eq("user_id", userId)
            .is("revoked_at", null);
    }
}