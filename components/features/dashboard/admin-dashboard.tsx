import type { AdminDashboard } from "@/actions/dashboard";
import { StatTile } from "@/components/features/reports/stat-tile";

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Section 5.9: "Admin dashboard: today's appointments, patients seen today, revenue today, outstanding balance, upcoming week's load." */
export function AdminDashboardView({ data }: { data: AdminDashboard }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Today's appointments" value={String(data.todaysAppointments)} />
      <StatTile label="Patients seen today" value={String(data.patientsSeenToday)} />
      <StatTile label="Revenue today" value={money(data.revenueToday)} />
      <StatTile label="Outstanding balance" value={money(data.outstandingBalance)} />
      <StatTile label="This week's load" value={String(data.upcomingWeekLoad)} hint="Appointments through Sunday" />
    </div>
  );
}
