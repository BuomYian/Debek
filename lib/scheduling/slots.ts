/**
 * Pure slot-generation logic (Section 5.4): a doctor's bookable slots
 * for a given day = their weekly availability template, walked out in
 * fixed slot_duration_minutes increments, minus anything inside their
 * time off, minus anything already booked. This mirrors exactly what
 * supabase/seed.sql's candidate_slots CTE does in SQL for seeding — kept
 * as a separate, testable TypeScript function here because the booking
 * UI needs to compute this live, per request, not just once at seed
 * time.
 *
 * Deliberately timezone-naive: every Date below is constructed and
 * compared in whatever timezone the Node process runs in. Fine for a
 * single-location clinic (the mandate here); a multi-timezone deployment
 * would need date-fns-tz or similar, which isn't in scope.
 */

export type AvailabilityRow = {
  day_of_week: number;
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
};

export type TimeOffWindow = { start_datetime: string; end_datetime: string };
export type BookedWindow = { scheduled_start: string; scheduled_end: string };

export type Slot = { start: Date; end: Date };

function atTime(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(h ?? 0, m ?? 0, 0, 0);
  return result;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function computeAvailableSlots({
  date,
  availability,
  timeOff,
  booked,
  now,
}: {
  /** The calendar day to compute slots for (local time, time-of-day ignored). */
  date: Date;
  availability: AvailabilityRow[];
  timeOff: TimeOffWindow[];
  booked: BookedWindow[];
  /** When provided, slots that start before `now` are excluded (booking "today"). */
  now?: Date;
}): Slot[] {
  const dayOfWeek = date.getDay();
  const templateRows = availability.filter((row) => row.is_active && row.day_of_week === dayOfWeek);

  const rawSlots: Slot[] = [];
  for (const row of templateRows) {
    const rowStart = atTime(date, row.start_time);
    const rowEnd = atTime(date, row.end_time);
    const durationMs = row.slot_duration_minutes * 60_000;

    let cursor = rowStart;
    while (cursor.getTime() + durationMs <= rowEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + durationMs);
      rawSlots.push({ start: cursor, end: slotEnd });
      cursor = slotEnd;
    }
  }

  return rawSlots.filter((slot) => {
    if (now && slot.start < now) return false;
    const blockedByTimeOff = timeOff.some((t) =>
      rangesOverlap(slot.start, slot.end, new Date(t.start_datetime), new Date(t.end_datetime)),
    );
    if (blockedByTimeOff) return false;
    const blockedByBooking = booked.some((b) =>
      rangesOverlap(slot.start, slot.end, new Date(b.scheduled_start), new Date(b.scheduled_end)),
    );
    return !blockedByBooking;
  });
}
