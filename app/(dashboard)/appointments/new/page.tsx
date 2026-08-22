import { getPatient } from "@/actions/patients";
import { BookingForm } from "@/components/features/appointments/booking-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Book Appointment" };

export default async function NewAppointmentPage(props: PageProps<"/appointments/new">) {
  await requireUser();
  const searchParams = await props.searchParams;
  const patientId = typeof searchParams.patientId === "string" ? searchParams.patientId : undefined;

  const initialPatient = patientId ? await getPatient(patientId) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Book an appointment</h1>
        <p className="text-sm text-muted-foreground">Patient, doctor, and a live-available slot.</p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New appointment</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingForm initialPatient={initialPatient?.success ? initialPatient.data : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
