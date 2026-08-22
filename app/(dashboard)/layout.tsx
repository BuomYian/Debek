import type { ReactNode } from "react";

import { AppSidebar } from "@/components/features/layout/app-sidebar";
import { SessionTimeoutHandler } from "@/components/features/layout/session-timeout-handler";
import { Topbar } from "@/components/features/layout/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth/guards";

/**
 * Shell for all authenticated staff routes (Admin / Doctor /
 * Receptionist). `requireUser()` is the second of the three enforcement
 * layers from Section 3 — proxy.ts already redirected an unauthenticated
 * request before this ever renders, but a Server Component re-checking
 * its own precondition is what makes that defence-in-depth rather than
 * a single point of failure.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar role={user.role} />
      <SidebarInset>
        <Topbar user={user} />
        <main className="flex flex-1 flex-col gap-4 p-6 print:p-0">{children}</main>
      </SidebarInset>
      <SessionTimeoutHandler />
    </SidebarProvider>
  );
}
