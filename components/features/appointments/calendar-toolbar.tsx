"use client";

import { addDays, addMonths, addWeeks, format } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CalendarView = "day" | "week" | "month";

function shiftDate(date: Date, view: CalendarView, direction: 1 | -1): Date {
  if (view === "day") return addDays(date, direction);
  if (view === "week") return addWeeks(date, direction);
  return addMonths(date, direction);
}

export function CalendarToolbar({
  view,
  date,
  canBook,
}: {
  view: CalendarView;
  date: Date;
  canBook: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(nextView: CalendarView, nextDate: Date) {
    const params = new URLSearchParams(searchParams);
    params.set("view", nextView);
    params.set("date", format(nextDate, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate(view, shiftDate(date, view, -1))} aria-label="Previous">
          <ChevronLeft />
        </Button>
        <Button variant="outline" onClick={() => navigate(view, new Date())}>
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={() => navigate(view, shiftDate(date, view, 1))} aria-label="Next">
          <ChevronRight />
        </Button>
        <span className="ml-2 text-sm font-medium">
          {view === "month" ? format(date, "MMMM yyyy") : format(date, "d MMMM yyyy")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Tabs value={view} onValueChange={(v) => navigate(v as CalendarView, date)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        {canBook && (
          <Button asChild size="sm">
            <Link href="/appointments/new">
              <Plus />
              Book
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
