"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./types";

/**
 * Browser-side Supabase client. Uses the public anon key only — this is
 * safe to ship to the client because every table is protected by Row
 * Level Security (Section 3 / Section 7). Use this from Client Components
 * that need realtime subscriptions or client-side reads; prefer the
 * server client (lib/supabase/server.ts) inside Server Components and
 * Server Actions.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
