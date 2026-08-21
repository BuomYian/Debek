import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/guards";

/**
 * Admin-only for now. Section 3 gives doctors "own workload only" and
 * receptionists a "limited (daily queue)" view — those are surfaced on
 * /dashboard itself once Phase 11 builds it, rather than by opening up
 * this full reports section (which includes revenue and cross-doctor
 * comparisons neither role should browse).
 */
export default async function ReportsLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin"]);
  return <>{children}</>;
}
