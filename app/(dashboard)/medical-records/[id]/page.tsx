import { notFound } from "next/navigation";

import { getMyDoctorRecord } from "@/actions/doctors";
import { getMedicalRecord } from "@/actions/medical-records";
import { listPrescriptionsForRecord } from "@/actions/prescriptions";
import { MedicalRecordView } from "@/components/features/medical-records/medical-record-view";
import { requireUser } from "@/lib/auth/guards";

export async function generateMetadata(props: PageProps<"/medical-records/[id]">) {
  const { id } = await props.params;
  const result = await getMedicalRecord(id);
  return {
    title: result.success ? `Consultation — ${result.data.patient?.first_name} ${result.data.patient?.last_name}` : "Consultation",
  };
}

export default async function MedicalRecordDetailPage(props: PageProps<"/medical-records/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const result = await getMedicalRecord(id);

  if (!result.success) notFound();
  const record = result.data;

  // record.doctor_id references doctors.id, not the profile/auth id —
  // "own consultations" (Section 3) means this doctor authored it,
  // which needs their own doctors.id to compare against.
  let canEdit = false;
  if (user.role === "doctor") {
    const myDoctor = await getMyDoctorRecord();
    canEdit = myDoctor.success && myDoctor.data.id === record.doctor_id;
  }

  const prescriptionsResult = await listPrescriptionsForRecord(record.id);
  const prescriptions = prescriptionsResult.success ? prescriptionsResult.data : [];

  return <MedicalRecordView record={record} canEdit={canEdit} prescriptions={prescriptions} />;
}
