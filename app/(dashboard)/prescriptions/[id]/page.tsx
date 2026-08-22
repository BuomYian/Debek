import { notFound } from "next/navigation";

import { getMyDoctorRecord } from "@/actions/doctors";
import { getPrescription } from "@/actions/prescriptions";
import { PrescriptionView } from "@/components/features/prescriptions/prescription-view";
import { requireRole } from "@/lib/auth/guards";

export async function generateMetadata(props: PageProps<"/prescriptions/[id]">) {
  const { id } = await props.params;
  const result = await getPrescription(id);
  return {
    title: result.success ? `Prescription — ${result.data.patient?.first_name} ${result.data.patient?.last_name}` : "Prescription",
  };
}

export default async function PrescriptionDetailPage(props: PageProps<"/prescriptions/[id]">) {
  const user = await requireRole(["admin", "doctor"]);
  const { id } = await props.params;
  const result = await getPrescription(id);

  if (!result.success) notFound();
  const prescription = result.data;

  let canEdit = false;
  if (user.role === "doctor") {
    const myDoctor = await getMyDoctorRecord();
    canEdit = myDoctor.success && myDoctor.data.id === prescription.doctor_id;
  }

  return <PrescriptionView prescription={prescription} canEdit={canEdit} />;
}
