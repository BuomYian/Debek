import type { ReactNode } from "react";

/**
 * Shell for unauthenticated routes (login, forgot-password).
 * Centred card layout — no sidebar, no session-dependent chrome.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
