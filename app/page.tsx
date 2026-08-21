import { redirect } from "next/navigation";

/**
 * Root route. Real behaviour (Phase 3): if there's a session, redirect to
 * /dashboard; otherwise redirect to /login. Until auth lands, always send
 * visitors to /login so there's a single, predictable entry point.
 */
export default function RootPage() {
  redirect("/login");
}
