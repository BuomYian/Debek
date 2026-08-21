import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientForm } from "@/components/features/patients/patient-form";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Register Patient" };

export default async function NewPatientPage() {
  await requireRole(["admin", "receptionist"]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Register a new patient</h1>
        <p className="text-sm text-muted-foreground">Full demographic and medical-alert details.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Patient details</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientForm />
        </CardContent>
      </Card>
    </div>
  );
}
