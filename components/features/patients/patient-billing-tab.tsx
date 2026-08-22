import { format, parseISO } from "date-fns";
import { Receipt } from "lucide-react";
import Link from "next/link";

import type { InvoiceWithDetails } from "@/actions/billing";
import { InvoiceStatusBadge } from "@/components/features/billing/invoice-status-badge";

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function PatientBillingTab({ invoices }: { invoices: InvoiceWithDetails[] }) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
        <Receipt className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {invoices.map((inv) => (
        <Link
          key={inv.id}
          href={`/billing/${inv.id}`}
          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-medium">{inv.invoice_number}</span>
            <span className="text-xs text-muted-foreground">{format(parseISO(inv.issue_date), "d MMM yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{money(inv.total)}</span>
            <InvoiceStatusBadge status={inv.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
