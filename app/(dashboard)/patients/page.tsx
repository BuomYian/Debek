import { UserRoundSearch } from "lucide-react";

import { listPatients } from "@/actions/patients";
import { patientColumns } from "@/components/features/patients/patient-columns";
import { PatientsToolbar } from "@/components/features/patients/patients-toolbar";
import { DataTable } from "@/components/data-table";
import { PaginationControls } from "@/components/pagination-controls";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Patients" };

const PAGE_SIZE = 20;

export default async function PatientsPage(props: PageProps<"/patients">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;

  const result = await listPatients({ page, pageSize: PAGE_SIZE, search });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Patients</h1>
        <p className="text-sm text-muted-foreground">The clinic&apos;s patient register.</p>
      </div>

      <PatientsToolbar canRegister={user.role === "admin" || user.role === "receptionist"} />

      {result.success ? (
        result.data.patients.length === 0 && !search ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
            <UserRoundSearch className="size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-base font-medium">No patients yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {user.role === "doctor"
                ? "No patients have been registered yet."
                : "Register your first patient to get started."}
            </p>
          </div>
        ) : (
          <>
            <DataTable
              columns={patientColumns}
              data={result.data.patients}
              emptyMessage={search ? `No patients match "${search}".` : "No patients yet."}
            />
            <PaginationControls page={page} pageSize={PAGE_SIZE} total={result.data.total} />
          </>
        )
      ) : (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
