import { Users } from "lucide-react";

import { listTodaysQueue } from "@/actions/appointments";
import { QueueBoard } from "@/components/features/appointments/queue-board";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Today's Queue" };

export default async function TodaysQueuePage() {
  await requireRole(["admin", "receptionist"]);

  const result = await listTodaysQueue();
  const appointments = result.success ? result.data : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Today&apos;s queue</h1>
        <p className="text-sm text-muted-foreground">Who&apos;s waiting, who&apos;s with a doctor, and who&apos;s next.</p>
      </div>

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : appointments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>
        </div>
      ) : (
        <QueueBoard appointments={appointments} />
      )}
    </div>
  );
}
