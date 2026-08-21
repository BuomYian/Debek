import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser, type UserRole } from "./session";

/**
 * Second of the three enforcement layers from Section 3 (proxy.ts is the
 * first, RLS is the third). proxy.ts only checks "is there a session" —
 * these check *role*, at the point where a Server Component or Server
 * Action would otherwise start doing real work.
 *
 * Call `requireUser()`/`requireRole()` at the very top of a protected
 * layout or page (before any data fetching) and at the top of every
 * Server Action that mutates something role-restricted. Never rely on
 * the client having hidden the button — always re-check here too.
 */

/** Redirects to /login if there's no active session. Returns the user otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Redirects to /login if unauthenticated, or to /dashboard if
 * authenticated but not one of `roles`. Use at the top of a
 * role-restricted layout (e.g. app/(dashboard)/admin/layout.tsx).
 */
export async function requireRole(roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/**
 * For Server Actions: same role check, but returns a typed failure
 * instead of redirecting (a mutation should report an error to the
 * caller, not silently navigate them away). Pair with the
 * `ActionResult<T>` shape from lib/validations/common.ts:
 *
 *   const auth = await requireRoleForAction(['admin']);
 *   if (!auth.ok) return { success: false, error: auth.error };
 */
export async function requireRoleForAction(
  roles: UserRole[],
): Promise<{ ok: true; user: CurrentUser } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in to do that." };
  if (!roles.includes(user.role)) {
    return { ok: false, error: "You don't have permission to do that." };
  }
  return { ok: true, user };
}
