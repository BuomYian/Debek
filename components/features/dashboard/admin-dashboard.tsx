import type { AdminDashboard } from "@/actions/dashboard";
import { CategoricalPieChart } from "@/components/features/reports/categorical-pie-chart";
import { StatTile } from "@/components/features/reports/stat-tile";
import { TimeSeriesLineChart } from "@/components/features/reports/time-series-line-chart";
import { formatMoney as money } from "@/lib/currency";

/** Section 5.9: "Admin dashboard: today's appointments, patients seen today, revenue today, outstanding balance, upcoming week's load." */
export function AdminDashboardView({ data }: { data: AdminDashboard }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Today's appointments" value={String(data.todaysAppointments)} />
        <StatTile label="Patients seen today" value={String(data.patientsSeenToday)} />
        <StatTile label="Revenue today" value={money(data.revenueToday)} />
        <StatTile label="Outstanding balance" value={money(data.outstandingBalance)} />
        <StatTile label="This week's load" value={String(data.upcomingWeekLoad)} hint="Appointments through Sunday" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 lg:grid lg:grid-rows-2 lg:gap-4">
          <TimeSeriesLineChart title="Appointments — last 7 days" data={data.appointmentTrend} valueLabel="Appointments" />
          <TimeSeriesLineChart title="Revenue — last 7 days" data={data.revenueTrend} valueLabel="Revenue" valueFormat="currency" />
        </div>
        <CategoricalPieChart title="Today's appointments by status" data={data.statusBreakdownToday} />
      </div>
    </div>
  );
}
