import { format, subDays } from "date-fns";

import { getAppointmentsReport } from "@/actions/reports";
import { CategoricalPieChart } from "@/components/features/reports/categorical-pie-chart";
import { DateRangeFilter } from "@/components/features/reports/date-range-filter";
import { SingleSeriesBarChart } from "@/components/features/reports/single-series-bar-chart";
import { StatTile } from "@/components/features/reports/stat-tile";
import { TimeSeriesLineChart } from "@/components/features/reports/time-series-line-chart";
import { CsvExportButton } from "@/components/csv-export-button";
import { toCsv } from "@/lib/csv";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Appointment Reports" };

export default async function AppointmentsReportPage(props: PageProps<"/reports/appointments">) {
  await requireRole(["admin"]);
  const searchParams = await props.searchParams;
  const from = typeof searchParams.from === "string" ? searchParams.from : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const to = typeof searchParams.to === "string" ? searchParams.to : format(new Date(), "yyyy-MM-dd");

  const result = await getAppointmentsReport({ from, to });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Appointment reports</h1>
          <p className="text-sm text-muted-foreground">Volume, status, no-shows and cancellations.</p>
        </div>
        {result.success && <CsvExportButton filename={`appointments-${from}-to-${to}.csv`} csv={toCsv(result.data.volumeOverTime)} />}
      </div>

      <DateRangeFilter from={from} to={to} />

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile label="Total appointments" value={String(result.data.total)} />
            <StatTile label="No-show rate" value={`${result.data.noShowRate}%`} />
            <StatTile label="Cancellation rate" value={`${result.data.cancellationRate}%`} />
          </div>

          <TimeSeriesLineChart title="Volume over time" data={result.data.volumeOverTime} valueLabel="Appointments" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoricalPieChart title="By status" data={result.data.byStatus} />
            <SingleSeriesBarChart title="By specialization" data={result.data.bySpecialization} valueLabel="Appointments" />
          </div>

          <SingleSeriesBarChart title="By doctor" data={result.data.byDoctor} valueLabel="Appointments" />
        </>
      )}
    </div>
  );
}
