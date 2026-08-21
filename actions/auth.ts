"use server";

import { redirect } from "next/navigation";

import { getSiteUrl } from "@/lib/site";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validations/common";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

// Login rate-limiting is intentionally not re-implemented here: Supabase
// Auth (GoTrue) already throttles the password sign-in endpoint per
// email/IP server-side (Section 7's requirement). A per-instance
// in-memory counter in this Next.js app wouldn't add real protection —
// it resets on every deploy/restart and doesn't work across serverless
// instances — so it would be a false sense of security rather than a
// second layer.

export async function signIn(input: LoginInput, redirectTo?: string): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      // Deliberately generic — never reveal whether the email or the
      // password was the wrong part.
      return { success: false, error: "Incorrect email or password." };
    }
  } catch (err) {
    console.error("signIn failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // Only ever redirect to a same-origin relative path — `redirectTo`
  // comes from a `?next=` query param proxy.ts set, which is
  // attacker-controllable, so a value like `//evil.com` must never be
  // followed as an open redirect.
  const safeRedirect = redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";

  // Outside the try block on purpose: redirect() throws internally, and
  // must never be caught by the generic error handler above.
  redirect(safeRedirect);
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("signOut failed", err);
  }
  redirect("/login");
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResult<null>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
  } catch (err) {
    console.error("requestPasswordReset failed", err);
    // Fall through to the generic success message below regardless.
  }

  // Always report success, whether or not the email is registered —
  // this endpoint must not be usable to enumerate staff accounts.
  return { success: true, data: null };
}

export async function updatePassword(input: ResetPasswordInput): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Your password reset link has expired. Request a new one." };
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return { success: false, error: error.message };
    }
  } catch (err) {
    console.error("updatePassword failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  redirect("/dashboard");
}
