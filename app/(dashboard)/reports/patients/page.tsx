import { format, subDays } from "date-fns";

import { getPatientsReport } from "@/actions/reports";
import { CategoricalPieChart } from "@/components/features/reports/categorical-pie-chart";
import { DateRangeFilter } from "@/components/features/reports/date-range-filter";
import { SingleSeriesBarChart } from "@/components/features/reports/single-series-bar-chart";
import { StatTile } from "@/components/features/reports/stat-tile";
import { TimeSeriesLineChart } from "@/components/features/reports/time-series-line-chart";
import { CsvExportButton } from "@/components/csv-export-button";
import { toCsv } from "@/lib/csv";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Patient Reports" };

export default async function PatientsReportPage(props: PageProps<"/reports/patients">) {
  await requireRole(["admin"]);
  const searchParams = await props.searchParams;
  const from = typeof searchParams.from === "string" ? searchParams.from : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const to = typeof searchParams.to === "string" ? searchParams.to : format(new Date(), "yyyy-MM-dd");

  const result = await getPatientsReport({ from, to });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Patient reports</h1>
          <p className="text-sm text-muted-foreground">Registrations, demographics, new vs returning.</p>
        </div>
        {result.success && (
          <CsvExportButton filename={`patients-${from}-to-${to}.csv`} csv={toCsv(result.data.registrationsOverTime)} />
        )}
      </div>

      <DateRangeFilter from={from} to={to} />

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile label="Total active patients" value={String(result.data.totalActive)} />
            <StatTile label="New in range" value={String(result.data.newCount)} />
            <StatTile label="Returning in range" value={String(result.data.returningCount)} />
          </div>

          <TimeSeriesLineChart title="New registrations over time" data={result.data.registrationsOverTime} valueLabel="Registrations" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SingleSeriesBarChart title="Age distribution (active patients)" data={result.data.ageDistribution} valueLabel="Patients" />
            <CategoricalPieChart title="Gender distribution (active patients)" data={result.data.genderDistribution} />
          </div>
        </>
      )}
    </div>
  );
}
