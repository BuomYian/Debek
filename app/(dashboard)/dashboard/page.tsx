import { Construction } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import type { UserRole } from "@/lib/auth/session";

export const metadata = { title: "Dashboard" };

const GREETING_BY_ROLE: Record<UserRole, { title: string; description: string }> = {
  admin: {
    title: "Today at a glance",
    description: "Today's appointments, patients seen, revenue, outstanding balance, and the week ahead.",
  },
  doctor: {
    title: "Your day",
    description: "Today's schedule, patients seen this week, and your next appointment.",
  },
  receptionist: {
    title: "Front desk",
    description: "Today's queue, check-in actions, and a quick-book shortcut.",
  },
};

/**
 * Section 5.1: "Auto-redirect to the correct dashboard after login."
 * There is one /dashboard route (Section 8) whose *content* is
 * role-aware, rather than a distinct URL per role — this is that
 * role-aware shell. The real widgets (charts, today's counts, revenue)
 * are built in Phase 11; this establishes that a doctor really does see
 * a different dashboard from a receptionist, today.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const copy = GREETING_BY_ROLE[user.role];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Welcome back, {user.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Construction className="size-4 text-muted-foreground" aria-hidden="true" />
            {copy.title}
          </CardTitle>
          <CardDescription>
            Live counts and charts arrive in Phase 11, once appointments, records and billing exist to
            summarise. For now, use the sidebar to reach what&apos;s already built.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
