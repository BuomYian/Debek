import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Landing point for every Supabase Auth email link (password reset,
 * staff invite). The Supabase project's email templates must link here
 * with `token_hash`, `type`, and `next` query params, e.g.:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 *
 * See README.md's "Email templates" section for the exact templates to
 * paste into the Supabase dashboard (Authentication → Email Templates).
 * This is Supabase's own recommended pattern (verifyOtp with a
 * token_hash) rather than the older implicit/PKCE code-exchange flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const url = new URL("/login", origin);
  url.searchParams.set("error", "invalid-link");
  return NextResponse.redirect(url);
}
