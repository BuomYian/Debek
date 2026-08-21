import { notFound } from "next/navigation";

import { getPatient } from "@/actions/patients";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { PatientOverview } from "@/components/features/patients/patient-overview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth/guards";

export async function generateMetadata(props: PageProps<"/patients/[id]">) {
  const { id } = await props.params;
  const result = await getPatient(id);
  return { title: result.success ? `${result.data.first_name} ${result.data.last_name}` : "Patient" };
}

export default async function PatientDetailPage(props: PageProps<"/patients/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const result = await getPatient(id);

  if (!result.success) notFound();
  const patient = result.data;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">
          {patient.first_name} {patient.last_name}
        </h1>
        <p className="text-sm text-muted-foreground">{patient.patient_number}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <PatientOverview patient={patient} canEdit={user.role === "admin" || user.role === "receptionist"} />
        </TabsContent>
        <TabsContent value="appointments">
          <ModulePlaceholder
            title="Appointments"
            description="This patient's appointment history and upcoming bookings."
            phase="Phase 6"
          />
        </TabsContent>
        <TabsContent value="records">
          <ModulePlaceholder
            title="Medical Records"
            description="Chronological consultation history."
            phase="Phase 7"
          />
        </TabsContent>
        <TabsContent value="prescriptions">
          <ModulePlaceholder title="Prescriptions" description="Issued prescriptions for this patient." phase="Phase 8" />
        </TabsContent>
        <TabsContent value="billing">
          <ModulePlaceholder title="Billing" description="Invoices and payment history." phase="Phase 9" />
        </TabsContent>
        <TabsContent value="files">
          <ModulePlaceholder title="Files" description="Lab results, scans, referrals and other documents." phase="Phase 10" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
