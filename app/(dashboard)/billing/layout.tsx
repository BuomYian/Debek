import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/guards";

/** Section 3: billing is Admin + Receptionist only — Doctor has no access at all. */
export default async function BillingLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin", "receptionist"]);
  return <>{children}</>;
}
