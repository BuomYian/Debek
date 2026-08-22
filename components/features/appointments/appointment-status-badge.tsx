import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/validations/appointments";

// Colour-coded by status (Section 5.4) — but colour is never the only
// signal: the label text ships with every badge, so this still reads
// fine without colour vision (Section 6, WCAG 2.1 AA).
const STATUS_STYLES: Record<AppointmentStatus, string> = {
  scheduled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  checked_in: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  in_progress: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_STYLES[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
