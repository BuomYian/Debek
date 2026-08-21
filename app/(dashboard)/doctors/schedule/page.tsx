import { getMyDoctorRecord, listAvailability, listTimeOff } from "@/actions/doctors";
import { AvailabilityEditor } from "@/components/features/doctors/availability-editor";
import { DoctorProfileCard } from "@/components/features/doctors/doctor-profile-card";
import { TimeOffEditor } from "@/components/features/doctors/time-off-editor";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "My Schedule" };

export default async function MySchedulePage() {
  // Doctor-only: an admin has no personal doctor row to manage here —
  // they manage any doctor's schedule via /doctors/[id] instead.
  await requireRole(["doctor"]);

  const doctorResult = await getMyDoctorRecord();
  if (!doctorResult.success) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {doctorResult.error}
      </p>
    );
  }
  const doctor = doctorResult.data;

  const [availabilityResult, timeOffResult] = await Promise.all([
    listAvailability(doctor.id),
    listTimeOff(doctor.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">My schedule</h1>
        <p className="text-sm text-muted-foreground">Your profile, weekly availability, and time off.</p>
      </div>

      <DoctorProfileCard doctor={doctor} canEdit />
      <AvailabilityEditor doctorId={doctor.id} rows={availabilityResult.success ? availabilityResult.data : []} canEdit />
      <TimeOffEditor doctorId={doctor.id} entries={timeOffResult.success ? timeOffResult.data : []} canEdit />
    </div>
  );
}
