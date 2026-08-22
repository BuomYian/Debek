import { BarChart3, DollarSign, Stethoscope, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Reports" };

const REPORTS = [
  {
    href: "/reports/appointments",
    icon: BarChart3,
    title: "Appointments",
    description: "Volume, status, by doctor, by specialization, no-show and cancellation rates.",
  },
  {
    href: "/reports/patients",
    icon: Users,
    title: "Patients",
    description: "New registrations, active total, age/gender distribution, new vs returning.",
  },
  {
    href: "/reports/revenue",
    icon: DollarSign,
    title: "Revenue",
    description: "Total billed, collected, outstanding balance, by doctor and payment method.",
  },
  {
    href: "/reports/workload",
    icon: Stethoscope,
    title: "Doctor workload",
    description: "Consultations per doctor, daily average, utilisation against available slots.",
  },
];

export default async function ReportsIndexPage() {
  await requireRole(["admin"]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Date-range filtered, with CSV export.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <report.icon className="mb-2 size-5 text-muted-foreground" aria-hidden="true" />
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
