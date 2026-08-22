import { Receipt } from "lucide-react";

import { listInvoices } from "@/actions/billing";
import { DataTable } from "@/components/data-table";
import { invoiceColumns } from "@/components/features/billing/invoice-columns";
import { InvoicesToolbar } from "@/components/features/billing/invoices-toolbar";
import { PaginationControls } from "@/components/pagination-controls";
import { requireRole } from "@/lib/auth/guards";
import type { InvoiceStatus } from "@/lib/validations/billing";

export const metadata = { title: "Invoices" };

const PAGE_SIZE = 20;
const VALID_STATUSES: InvoiceStatus[] = ["unpaid", "partially_paid", "paid", "cancelled"];

export default async function InvoicesPage(props: PageProps<"/billing/invoices">) {
  await requireRole(["admin", "receptionist"]);
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const status = VALID_STATUSES.find((s) => s === statusParam);

  const result = await listInvoices({ page, pageSize: PAGE_SIZE, status, search });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Invoices</h1>
        <p className="text-sm text-muted-foreground">Auto-drafted when an appointment is completed.</p>
      </div>

      <InvoicesToolbar />

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : result.data.invoices.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Receipt className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {search || status ? "No invoices match those filters." : "No invoices yet."}
          </p>
        </div>
      ) : (
        <>
          <DataTable columns={invoiceColumns} data={result.data.invoices} />
          <PaginationControls page={page} pageSize={PAGE_SIZE} total={result.data.total} />
        </>
      )}
    </div>
  );
}
