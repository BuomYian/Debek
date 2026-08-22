"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/currency";

type ValueFormat = "number" | "currency" | "percent";

// Formatting lives here, inside the Client Component, deliberately — a
// Server Component can't pass a plain function prop into a "use client"
// component (only data and Server Actions cross that boundary), so the
// caller passes a format *name* and this component owns the function.
function formatValue(value: number, kind: ValueFormat): string {
  if (kind === "currency") return formatMoney(value);
  if (kind === "percent") return `${value}%`;
  return String(value);
}

/**
 * "Value by category" with a single measure — one hue is correct here,
 * not a distinct color per bar: the x-axis labels already distinguish
 * categories, so per-bar color would just be decoration (dataviz skill:
 * "assign color by the job it does" — there's no second dimension to
 * encode).
 */
export function SingleSeriesBarChart({
  title,
  data,
  valueLabel,
  valueFormat = "number",
}: {
  title: string;
  data: { label: string; value: number }[];
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
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                angle={-20}
                textAnchor="end"
                height={50}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={valueFormat === "currency" ? 56 : 40}
                tickFormatter={(value: number) => value.toLocaleString("en-US")}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                formatter={(value) => {
                  const num = typeof value === "number" ? value : Number(value);
                  return [formatValue(num, valueFormat), valueLabel];
                }}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
