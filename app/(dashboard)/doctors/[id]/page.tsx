import { notFound } from "next/navigation";

import { getDoctor, listAvailability, listTimeOff } from "@/actions/doctors";
import { AvailabilityEditor } from "@/components/features/doctors/availability-editor";
import { DoctorProfileCard } from "@/components/features/doctors/doctor-profile-card";
import { TimeOffEditor } from "@/components/features/doctors/time-off-editor";
import { requireUser } from "@/lib/auth/guards";

export async function generateMetadata(props: PageProps<"/doctors/[id]">) {
  const { id } = await props.params;
  const result = await getDoctor(id);
  return { title: result.success ? (result.data.profile?.full_name ?? "Doctor") : "Doctor" };
}

export default async function DoctorDetailPage(props: PageProps<"/doctors/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;

  const doctorResult = await getDoctor(id);
  if (!doctorResult.success) notFound();
  const doctor = doctorResult.data;

  const [availabilityResult, timeOffResult] = await Promise.all([listAvailability(id), listTimeOff(id)]);

  const canEdit = user.role === "admin" || (user.role === "doctor" && doctor.profile_id === user.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{doctor.profile?.full_name}</h1>
        <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
      </div>

      <DoctorProfileCard doctor={doctor} canEdit={canEdit} />
      <AvailabilityEditor
        doctorId={doctor.id}
        rows={availabilityResult.success ? availabilityResult.data : []}
        canEdit={canEdit}
      />
      <TimeOffEditor doctorId={doctor.id} entries={timeOffResult.success ? timeOffResult.data : []} canEdit={canEdit} />
    </div>
  );
}
