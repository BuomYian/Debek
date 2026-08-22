import { notFound } from "next/navigation";

import { getAppointment } from "@/actions/appointments";
import { getPatient } from "@/actions/patients";
import { ConsultationForm } from "@/components/features/medical-records/consultation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "New Consultation" };

export default async function NewMedicalRecordPage(props: PageProps<"/medical-records/new">) {
  await requireRole(["doctor"]);
  const searchParams = await props.searchParams;
  const appointmentId = typeof searchParams.appointmentId === "string" ? searchParams.appointmentId : undefined;

  let fixedPatient = undefined;
  if (appointmentId) {
    const appointmentResult = await getAppointment(appointmentId);
    if (!appointmentResult.success || !appointmentResult.data.patient) notFound();
    const patientResult = await getPatient(appointmentResult.data.patient.id);
    if (!patientResult.success) notFound();
    fixedPatient = patientResult.data;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">New consultation</h1>
        <p className="text-sm text-muted-foreground">
          Chief complaint, vitals, diagnosis and treatment plan.
        </p>
      </div>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Consultation</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsultationForm fixedPatient={fixedPatient} appointmentId={appointmentId} />
        </CardContent>
      </Card>
    </div>
  );
}
