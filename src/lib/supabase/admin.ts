import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS. SERVER ONLY. It is the sole
 * writer of the `games` table: clients can't touch game state directly, so
 * every move goes through an API route that validates it with the shared
 * engine before writing here.
 *
 * SUPABASE_SERVICE_ROLE_KEY is server-only (no NEXT_PUBLIC_ prefix) and lives
 * in .env.local, which is gitignored. Never import this from a client file.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY missing — add it to .env.local (Supabase " +
        "dashboard → Settings → API → service_role, behind “Reveal”), then " +
        "restart the dev server.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
