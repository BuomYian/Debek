import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/validations/billing";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  partially_paid: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
  cancelled: "Cancelled",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_STYLES[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
