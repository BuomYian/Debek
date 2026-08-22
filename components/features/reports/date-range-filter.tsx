"use client";

import { format, startOfMonth, subDays } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setRange(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams);
    params.set("from", nextFrom);
    params.set("to", nextTo);
    router.push(`${pathname}?${params.toString()}`);
  }

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => {
        const presetFrom = format(subDays(new Date(), preset.days), "yyyy-MM-dd");
        const isActive = from === presetFrom && to === today;
        return (
          <Button
            key={preset.label}
            type="button"
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => setRange(presetFrom, today)}
          >
            {preset.label}
          </Button>
        );
      })}
      <Button
        type="button"
        variant={from === format(startOfMonth(new Date()), "yyyy-MM-dd") && to === today ? "default" : "outline"}
        size="sm"
        onClick={() => setRange(format(startOfMonth(new Date()), "yyyy-MM-dd"), today)}
      >
        Month to date
      </Button>
      <div className="ml-2 flex items-center gap-2">
        <Input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setRange(e.target.value, to)}
          className={cn("w-40")}
          aria-label="From date"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => setRange(from, e.target.value)}
          className="w-40"
          aria-label="To date"
        />
      </div>
    </div>
  );
}
