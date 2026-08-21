import type { ReactNode } from "react";

/**
 * Shell for all authenticated staff routes (Admin / Doctor / Receptionist).
 *
 * This is a structural placeholder for Phase 1. The real implementation
 * (Phase 3) adds: session check + redirect to /login, a role-aware sidebar
 * that only renders links the current role may use, a topbar with the
 * ⌘K global search, and the session-timeout handling required by
 * Section 5.1 / Section 6.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      {/* TODO(Phase 3): role-aware <Sidebar /> */}
      <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
    </div>
  );
}
