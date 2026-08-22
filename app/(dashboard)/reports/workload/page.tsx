import { format, subDays } from "date-fns";

import { getWorkloadReport } from "@/actions/reports";
import { DateRangeFilter } from "@/components/features/reports/date-range-filter";
import { SingleSeriesBarChart } from "@/components/features/reports/single-series-bar-chart";
import { CsvExportButton } from "@/components/csv-export-button";
import { toCsv } from "@/lib/csv";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Doctor Workload" };

export default async function WorkloadReportPage(props: PageProps<"/reports/workload">) {
  await requireRole(["admin"]);
  const searchParams = await props.searchParams;
  const from = typeof searchParams.from === "string" ? searchParams.from : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const to = typeof searchParams.to === "string" ? searchParams.to : format(new Date(), "yyyy-MM-dd");

  const result = await getWorkloadReport({ from, to });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Doctor workload</h1>
          <p className="text-sm text-muted-foreground">Consultations, daily average, and slot utilisation.</p>
        </div>
        {result.success && (
          <CsvExportButton filename={`workload-${from}-to-${to}.csv`} csv={toCsv(result.data.consultationsByDoctor)} />
        )}
      </div>

      <DateRangeFilter from={from} to={to} />

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : (
        <>
          <SingleSeriesBarChart title="Consultations per doctor" data={result.data.consultationsByDoctor} valueLabel="Consultations" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SingleSeriesBarChart
              title="Average consultations per working day"
              data={result.data.avgPerWorkingDay}
              valueLabel="Avg / day"
            />
            <SingleSeriesBarChart
              title="Utilisation against available slots"
              data={result.data.utilization}
              valueLabel="Utilisation"
              valueFormat="percent"
            />
          </div>
        </>
      )}
    </div>
  );
}
