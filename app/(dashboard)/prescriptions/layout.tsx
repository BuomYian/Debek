import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/guards";

/** Section 3: prescriptions are Admin (view only) + Doctor — Receptionist has no access. */
export default async function PrescriptionsLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin", "doctor"]);
  return <>{children}</>;
}
