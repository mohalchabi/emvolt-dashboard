import { OPERATING_HOURS, CALENDAR_SLOT_MINUTES } from "@/lib/constants";

export const TOTAL_SLOTS =
  ((OPERATING_HOURS.endHour - OPERATING_HOURS.startHour) * 60) / CALENDAR_SLOT_MINUTES;

export type TimeSlot = { index: number; label: string; isHour: boolean };

export const TIME_SLOTS: TimeSlot[] = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
  const totalMinutes = OPERATING_HOURS.startHour * 60 + i * CALENDAR_SLOT_MINUTES;
  const hour = Math.floor(totalMinutes / 60);
  const isHour = totalMinutes % 60 === 0;
  const label = new Date(2000, 0, 1, hour, totalMinutes % 60).toLocaleTimeString([], {
    hour: "numeric",
    minute: isHour ? undefined : "2-digit",
  });
  return { index: i, label, isHour };
});

// Grid rows are 1-indexed with row 1 reserved for the header; clamps
// sessions outside operating hours onto the first/last visible slot rather
// than dropping them.
export function rowRangeForSession(datetime: Date, durationMinutes: number) {
  const startMinutes =
    datetime.getHours() * 60 + datetime.getMinutes() - OPERATING_HOURS.startHour * 60;
  const startSlot = Math.min(
    Math.max(Math.floor(startMinutes / CALENDAR_SLOT_MINUTES), 0),
    TOTAL_SLOTS - 1
  );
  const slotSpan = Math.max(Math.ceil(durationMinutes / CALENDAR_SLOT_MINUTES), 1);
  const endSlot = Math.min(startSlot + slotSpan, TOTAL_SLOTS);
  return { gridRowStart: startSlot + 2, gridRowEnd: endSlot + 2 };
}
