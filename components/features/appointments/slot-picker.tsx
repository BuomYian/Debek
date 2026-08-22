"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { getAvailableSlots } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

export type PickedSlot = { start: string; end: string };

/**
 * Live-generated available slots (Section 5.4), computed from
 * doctor_availability minus existing appointments minus doctor_time_off
 * — see actions/appointments.ts#getAvailableSlots. Shared by the
 * booking form and the reschedule dialog.
 */
export function SlotPicker({
  doctorId,
  selected,
  onSelect,
}: {
  doctorId: string | undefined;
  selected: PickedSlot | null;
  onSelect: (slot: PickedSlot) => void;
}) {
  const [date, setDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<PickedSlot[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // No setSlots([]) here when doctorId is empty: the render below
    // already checks `!doctorId` before ever looking at `slots`, so a
    // stale list just stays unused rather than needing to be cleared.
    if (!doctorId) return;
    startTransition(async () => {
      const result = await getAvailableSlots({ doctorId, date: format(date, "yyyy-MM-dd") });
      setSlots(result.success ? result.data : []);
    });
  }, [doctorId, date]);

  return (
    <div className="flex flex-col gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-fit justify-start font-normal">
            <CalendarIcon className="size-4" />
            {format(date, "EEEE, d MMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {!doctorId ? (
        <p className="text-sm text-muted-foreground">Select a doctor first.</p>
      ) : isPending ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No available slots on this day. Try another date.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {slots.map((slot) => (
            <Button
              key={slot.start}
              type="button"
              variant={selected?.start === slot.start ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(slot)}
            >
              {format(parseISO(slot.start), "HH:mm")}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
