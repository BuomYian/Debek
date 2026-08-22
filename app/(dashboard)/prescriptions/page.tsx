import { Pill } from "lucide-react";

import { listPrescriptions } from "@/actions/prescriptions";
import { DataTable } from "@/components/data-table";
import { prescriptionColumns } from "@/components/features/prescriptions/prescription-columns";
import { PaginationControls } from "@/components/pagination-controls";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Prescriptions" };

const PAGE_SIZE = 20;

export default async function PrescriptionsPage(props: PageProps<"/prescriptions">) {
  await requireRole(["admin", "doctor"]);
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const result = await listPrescriptions({ page, pageSize: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">Issued from consultations.</p>
      </div>

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : result.data.prescriptions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Pill className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No prescriptions issued yet.</p>
        </div>
      ) : (
        <>
          <DataTable columns={prescriptionColumns} data={result.data.prescriptions} />
          <PaginationControls page={page} pageSize={PAGE_SIZE} total={result.data.total} />
        </>
      )}
    </div>
  );
}
