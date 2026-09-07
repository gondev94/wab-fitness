import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
// Lazy: se lee process.env al primer uso, después de dotenv.config()
export function getSupabaseAdmin(): SupabaseClient {
    if (client) return client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error(
            "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env",
        );
    }
    client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    return client;
}
