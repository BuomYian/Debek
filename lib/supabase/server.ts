import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Server Actions and Route
 * Handlers. Reads/writes the auth session via the request's cookies, so
 * `auth.uid()` is available to Postgres RLS policies on every query made
 * with this client.
 *
 * `cookies()` is async as of Next.js 15+, so this factory is async too —
 * always `await createServerClient()` at the call site.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` is called from a Server Component in some render
          // paths, where cookies are read-only. This is safe to ignore
          // as long as the session is also refreshed in proxy.ts (Phase 3),
          // which runs on every request and can write cookies freely.
        }
      },
    },
  });
}

/**
 * Admin/service-role client. Bypasses Row Level Security entirely — use
 * only for trusted server-side operations that must cross RLS boundaries
 * (e.g. the seed script, or admin user-invite flows). Never derive this
 * from user input, never use it to serve a request on the user's behalf,
 * and never import it into a Client Component.
 */
export async function createServiceRoleClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const { getSupabaseServiceRoleKey } = await import("./env");

  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
