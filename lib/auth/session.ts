import "server-only";

import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
};

/**
 * The single place that answers "who is signed in, and what's their
 * role" for Server Components and Server Actions. `cache()` de-dupes
 * this within one request/render pass — the dashboard layout, a page,
 * and a server action can all call it without tripping three separate
 * round trips to Supabase.
 *
 * Returns null if there's no session, or if the session's profile has
 * been deactivated (is_active = false) — a deactivated user is treated
 * as signed out everywhere in the app, not just blocked by RLS.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, phone, avatar_url, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    isActive: profile.is_active,
  };
});
