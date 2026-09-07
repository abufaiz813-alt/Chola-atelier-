import { createBrowserClient } from "@supabase/ssr";

// Used in Client Components — safe to expose, uses the public anon key
// which is restricted by the Row Level Security policies in schema.sql
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
