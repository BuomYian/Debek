import { format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAppointment } from "@/actions/appointments";
import { AppointmentActions } from "@/components/features/appointments/appointment-actions";
import { AppointmentStatusBadge } from "@/components/features/appointments/appointment-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";

export async function generateMetadata(props: PageProps<"/appointments/[id]">) {
  const { id } = await props.params;
  const result = await getAppointment(id);
  return { title: result.success ? result.data.appointment_number : "Appointment" };
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export default async function AppointmentDetailPage(props: PageProps<"/appointments/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const result = await getAppointment(id);

  if (!result.success) notFound();
  const appointment = result.data;

  const canEdit = user.role === "admin" || user.role === "receptionist" || user.role === "doctor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{appointment.appointment_number}</h1>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(appointment.scheduled_start), "EEEE, d MMMM yyyy · HH:mm")} –{" "}
            {format(parseISO(appointment.scheduled_end), "HH:mm")}
          </p>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>

      <AppointmentActions appointment={appointment} canEdit={canEdit} />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field
              label="Patient"
              value={
                appointment.patient && (
                  <Link href={`/patients/${appointment.patient.id}`} className="hover:underline">
                    {appointment.patient.first_name} {appointment.patient.last_name}
                  </Link>
                )
              }
            />
            <Field
              label="Doctor"
              value={
                appointment.doctor && (
                  <Link href={`/doctors/${appointment.doctor.id}`} className="hover:underline">
                    {appointment.doctor.profile?.full_name}
                  </Link>
                )
              }
            />
            <Field label="Specialization" value={appointment.doctor?.specialization} />
            <Field label="Reason for visit" value={appointment.reason_for_visit} />
            <Field label="Notes" value={appointment.notes} />
            {appointment.status === "cancelled" && <Field label="Cancellation reason" value={appointment.cancelled_reason} />}
            {appointment.rescheduled_from && (
              <Field
                label="Rescheduled from"
                value={
                  <Link href={`/appointments/${appointment.rescheduled_from}`} className="hover:underline">
                    View original
                  </Link>
                }
              />
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
