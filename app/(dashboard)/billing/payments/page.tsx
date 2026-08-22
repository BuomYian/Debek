import { differenceInDays, format, parseISO } from "date-fns";
import { CircleCheck } from "lucide-react";
import Link from "next/link";

import { listOutstandingInvoices } from "@/actions/billing";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Outstanding Balances" };

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Section 5.7: "Outstanding-balances list." */
export default async function OutstandingBalancesPage() {
  await requireRole(["admin", "receptionist"]);

  const result = await listOutstandingInvoices();
  const invoices = result.success ? result.data : [];
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Outstanding balances</h1>
        <p className="text-sm text-muted-foreground">
          {invoices.length} invoice{invoices.length === 1 ? "" : "s"} · {money(totalOutstanding)} total outstanding
        </p>
      </div>

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : invoices.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <CircleCheck className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Everything&apos;s paid up.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map((inv) => {
            const overdue = inv.due_date ? differenceInDays(new Date(), parseISO(inv.due_date)) > 0 : false;
            return (
              <Link
                key={inv.id}
                href={`/billing/${inv.id}`}
                className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm transition-colors hover:bg-accent"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : "—"}{" "}
                    <span className="font-mono text-xs text-muted-foreground">{inv.invoice_number}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Issued {format(parseISO(inv.issue_date), "d MMM yyyy")}
                    {inv.due_date && ` · Due ${format(parseISO(inv.due_date), "d MMM yyyy")}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {overdue && <Badge variant="destructive">Overdue</Badge>}
                  <span className="font-semibold">{money(inv.balance ?? 0)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
