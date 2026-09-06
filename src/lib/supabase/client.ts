import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Supabase env vars missing. Add NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see Settings → API in the " +
      "Supabase dashboard), then restart the dev server.",
  );
}

/** Supabase client for use in Client Components / browser code. */
export function createClient() {
  return createBrowserClient(url!, key!);
}
