import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireRole } from "@/lib/auth/guards";

export default async function TodaysQueuePage() {
  await requireRole(["admin", "receptionist"]);

  return (
    <ModulePlaceholder
      title="Today's Queue"
      description="Reception queue: waiting, with doctor, expected wait."
      phase="Phase 6"
    />
  );
}
