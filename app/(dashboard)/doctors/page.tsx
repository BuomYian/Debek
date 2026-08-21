import { Stethoscope } from "lucide-react";

import { listDoctors, listSpecializations } from "@/actions/doctors";
import { DataTable } from "@/components/data-table";
import { doctorColumns } from "@/components/features/doctors/doctor-columns";
import { AddDoctorDialog } from "@/components/features/doctors/add-doctor-dialog";
import { DoctorsToolbar } from "@/components/features/doctors/doctors-toolbar";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Doctors" };

export default async function DoctorsPage(props: PageProps<"/doctors">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const specialization = typeof searchParams.specialization === "string" ? searchParams.specialization : undefined;

  const [doctorsResult, specializationsResult] = await Promise.all([
    listDoctors({ specialization }),
    listSpecializations(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Doctors</h1>
          <p className="text-sm text-muted-foreground">Clinical staff directory.</p>
        </div>
        {user.role === "admin" && <AddDoctorDialog />}
      </div>

      <DoctorsToolbar specializations={specializationsResult.success ? specializationsResult.data : []} />

      {doctorsResult.success ? (
        doctorsResult.data.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
            <Stethoscope className="size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-base font-medium">No doctors {specialization ? "match that filter" : "yet"}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {user.role === "admin" && !specialization
                ? "Add a doctor profile to get started."
                : "Try a different specialization."}
            </p>
          </div>
        ) : (
          <DataTable columns={doctorColumns} data={doctorsResult.data} />
        )
      ) : (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {doctorsResult.error}
        </p>
      )}
    </div>
  );
}
