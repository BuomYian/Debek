import { format, subDays } from "date-fns";

import { getRevenueReport } from "@/actions/reports";
import { CategoricalPieChart } from "@/components/features/reports/categorical-pie-chart";
import { DateRangeFilter } from "@/components/features/reports/date-range-filter";
import { SingleSeriesBarChart } from "@/components/features/reports/single-series-bar-chart";
import { StatTile } from "@/components/features/reports/stat-tile";
import { CsvExportButton } from "@/components/csv-export-button";
import { toCsv } from "@/lib/csv";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Revenue Reports" };

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default async function RevenueReportPage(props: PageProps<"/reports/revenue">) {
  await requireRole(["admin"]);
  const searchParams = await props.searchParams;
  const from = typeof searchParams.from === "string" ? searchParams.from : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const to = typeof searchParams.to === "string" ? searchParams.to : format(new Date(), "yyyy-MM-dd");

  const result = await getRevenueReport({ from, to });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Revenue reports</h1>
          <p className="text-sm text-muted-foreground">Billed, collected, outstanding, by doctor and by method.</p>
        </div>
        {result.success && (
          <CsvExportButton filename={`revenue-${from}-to-${to}.csv`} csv={toCsv(result.data.revenueByDoctor)} />
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
            <StatTile label="Total billed" value={money(result.data.totalBilled)} hint="Invoices issued in range" />
            <StatTile label="Total collected" value={money(result.data.totalCollected)} hint="Payments received in range" />
            <StatTile label="Outstanding balance" value={money(result.data.outstandingBalance)} hint="Across all unpaid invoices, current" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SingleSeriesBarChart title="Revenue by doctor" data={result.data.revenueByDoctor} valueLabel="Revenue" valueFormat="currency" />
            <CategoricalPieChart title="Revenue by payment method" data={result.data.revenueByMethod} />
          </div>
        </>
      )}
    </div>
  );
}
