import { notFound } from "next/navigation";

import { listAppointments } from "@/actions/appointments";
import { listPatientMedicalRecords } from "@/actions/medical-records";
import { getPatient } from "@/actions/patients";
import { listPatientPrescriptions } from "@/actions/prescriptions";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { PatientAppointmentsTab } from "@/components/features/patients/patient-appointments-tab";
import { PatientMedicalRecordsTab } from "@/components/features/patients/patient-medical-records-tab";
import { PatientOverview } from "@/components/features/patients/patient-overview";
import { PatientPrescriptionsTab } from "@/components/features/patients/patient-prescriptions-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth/guards";

// Wide enough to cover any real appointment history without needing a
// dedicated "all time" query variant.
const HISTORY_FROM = "2000-01-01T00:00:00.000Z";
const HISTORY_TO = "2100-01-01T00:00:00.000Z";

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

  // Section 3: receptionist has zero access to clinical records
  // (medical records / prescriptions), doctor has zero access to
  // billing — those tabs simply don't render for them, rather than
  // rendering a tab that just errors.
  const canSeeClinical = user.role === "admin" || user.role === "doctor";
  const canSeeBilling = user.role === "admin" || user.role === "receptionist";

  const [appointmentsResult, recordsResult, prescriptionsResult] = await Promise.all([
    listAppointments({ from: HISTORY_FROM, to: HISTORY_TO, patientId: id }),
    canSeeClinical ? listPatientMedicalRecords(id) : Promise.resolve(null),
    canSeeClinical ? listPatientPrescriptions(id) : Promise.resolve(null),
  ]);

  const appointments = appointmentsResult.success
    ? [...appointmentsResult.data].sort((a, b) => b.scheduled_start.localeCompare(a.scheduled_start))
    : [];
  const records = recordsResult?.success ? recordsResult.data : [];
  const prescriptions = prescriptionsResult?.success ? prescriptionsResult.data : [];

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
          {canSeeClinical && <TabsTrigger value="records">Medical Records</TabsTrigger>}
          {canSeeClinical && <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>}
          {canSeeBilling && <TabsTrigger value="billing">Billing</TabsTrigger>}
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <PatientOverview patient={patient} canEdit={user.role === "admin" || user.role === "receptionist"} />
        </TabsContent>
        <TabsContent value="appointments">
          <PatientAppointmentsTab
            patientId={patient.id}
            appointments={appointments}
            canBook={user.role === "admin" || user.role === "receptionist"}
          />
        </TabsContent>
        {canSeeClinical && (
          <TabsContent value="records">
            <PatientMedicalRecordsTab records={records} />
          </TabsContent>
        )}
        {canSeeClinical && (
          <TabsContent value="prescriptions">
            <PatientPrescriptionsTab prescriptions={prescriptions} />
          </TabsContent>
        )}
        {canSeeBilling && (
          <TabsContent value="billing">
            <ModulePlaceholder title="Billing" description="Invoices and payment history." phase="Phase 9" />
          </TabsContent>
        )}
        <TabsContent value="files">
          <ModulePlaceholder title="Files" description="Lab results, scans, referrals and other documents." phase="Phase 10" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
