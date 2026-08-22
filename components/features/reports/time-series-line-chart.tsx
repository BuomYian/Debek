"use client";

import { format, parseISO } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/currency";

type ValueFormat = "number" | "currency" | "percent";

// Formatting lives here, inside the Client Component, deliberately — see
// the identical note in single-series-bar-chart.tsx: a Server Component
// can't pass a plain function prop into a "use client" component.
// Axis ticks use a compact form (no "SSP" prefix, no decimals) — SSP
// amounts run into the thousands, and the full formatMoney() string
// doesn't fit a Y-axis tick's width; the tooltip shows the full amount.
function formatValue(value: number, kind: ValueFormat, compact = false): string {
  if (kind === "currency") return compact ? value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : formatMoney(value);
  if (kind === "percent") return `${value}%`;
  return String(value);
}

export function TimeSeriesLineChart({
  title,
  data,
  valueLabel,
  valueFormat = "number",
}: {
  title: string;
  data: { date: string; count: number }[];
  valueLabel: string;
  valueFormat?: ValueFormat;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => format(parseISO(value), "d MMM")}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={valueFormat === "currency" ? 56 : 40}
                allowDecimals={valueFormat === "number" ? false : undefined}
                tickFormatter={(value: number) => formatValue(value, valueFormat, true)}
              />
              <Tooltip
                labelFormatter={(value) => (typeof value === "string" ? format(parseISO(value), "d MMMM yyyy") : value)}
                formatter={(value) => {
                  const num = typeof value === "number" ? value : Number(value);
                  return [formatValue(num, valueFormat), valueLabel];
                }}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-1)" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
