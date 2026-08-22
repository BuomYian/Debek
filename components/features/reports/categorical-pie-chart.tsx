"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Fixed hue order (dataviz skill, references/palette.md) — never cycled
// or re-sorted per-render; slot N always means the same color.
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

/** For genuinely categorical breakdowns (≥2 distinct series) — a legend always ships, per the skill's accessibility pass. */
export function CategoricalPieChart({ title, data }: { title: string; data: { label: string; value: number }[] }) {
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
            <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={56} outerRadius={90} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.label} fill={PALETTE[index % PALETTE.length]} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
