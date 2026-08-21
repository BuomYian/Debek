import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Routes reachable without a session. Everything else under the
 * `(dashboard)` route group requires one — see Section 3: "Next.js
 * middleware (route protection)" is the first of three enforcement
 * layers, the other two being server-action role checks and Postgres
 * RLS (lib/auth/guards.ts and the RLS policies in
 * supabase/migrations/0020_rls_policies.sql cover those).
 *
 * This only checks "is there a session at all" — it deliberately does
 * NOT do role-based routing (e.g. blocking a receptionist from
 * /admin/users). That needs the caller's role, which isn't in the
 * Supabase session cookie and would cost a database round trip on every
 * request to look up here. Role-specific gating instead happens in the
 * relevant layout/page server components (lib/auth/guards.ts), which
 * already have to render with a real DB connection anyway.
 */
const PUBLIC_PATH_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Re-validates the JWT against Supabase Auth (not just reading the
  // cookie) — this is what actually refreshes an expiring session, and
  // why we call getUser() here rather than the cheaper-but-unverified
  // getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/forgot-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: supabaseResponse must be returned as-is (or with its
  // cookies copied onto a new response) — constructing a fresh
  // NextResponse here would drop the refreshed session cookie and log
  // the user out on every request.
  return supabaseResponse;
}
