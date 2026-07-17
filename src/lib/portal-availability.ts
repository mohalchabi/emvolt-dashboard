import { prisma } from "@/lib/db";
import { OPERATING_HOURS, CALENDAR_SLOT_MINUTES } from "@/lib/constants";

export const DEFAULT_SESSION_DURATION = 20; // minutes — matches Session.duration's default everywhere else

function overlaps(aStart: Date, aDuration: number, bStart: Date, bDuration: number) {
  const aEnd = aStart.getTime() + aDuration * 60_000;
  const bEnd = bStart.getTime() + bDuration * 60_000;
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}

// True if `candidate` (DEFAULT_SESSION_DURATION long) doesn't overlap any of
// the trainer's existing non-cancelled sessions. Callers should re-check this
// at submission time too — the list rendered to the client can go stale.
export async function isSlotAvailable(trainerId: string, candidate: Date, excludeSessionId?: string) {
  const dayStart = new Date(candidate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(candidate);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.session.findMany({
    where: {
      trainerId,
      status: { not: "cancelled" },
      datetime: { gte: dayStart, lte: dayEnd },
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
    },
  });

  return !existing.some((s) => overlaps(candidate, DEFAULT_SESSION_DURATION, s.datetime, s.duration));
}

// Every operating-hours slot on `date` for `trainerId` that isn't already
// booked and isn't in the past.
export async function getAvailableSlots(trainerId: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.session.findMany({
    where: { trainerId, status: { not: "cancelled" }, datetime: { gte: dayStart, lte: dayEnd } },
  });

  const now = new Date();
  const slots: Date[] = [];
  for (let hour = OPERATING_HOURS.startHour; hour < OPERATING_HOURS.endHour; hour++) {
    for (let minute = 0; minute < 60; minute += CALENDAR_SLOT_MINUTES) {
      const candidate = new Date(date);
      candidate.setHours(hour, minute, 0, 0);
      if (candidate <= now) continue;
      const free = !existing.some((s) => overlaps(candidate, DEFAULT_SESSION_DURATION, s.datetime, s.duration));
      if (free) slots.push(candidate);
    }
  }
  return slots;
}
