import { prisma } from "@/lib/db";
import { startOfGymDay, endOfGymDay, gymDayKey } from "@/lib/time";

/**
 * Everything that made up one person's working day.
 *
 * The counts are worked out here from the sessions and contact attempts of the
 * day rather than stored on the report. A class closed out the next morning
 * then corrects the report instead of leaving it permanently short, which is
 * the whole reason the figures are worth reading.
 *
 * The shift times do come off the report, because those are a record of what
 * was clocked at the time and shouldn't drift.
 */
export type DayClass = {
  id: string;
  at: Date;
  clientName: string;
  clientId: string | null;
  status: string;
  type: string;
};

export type DayContact = {
  id: string;
  at: Date;
  leadId: string;
  leadName: string;
  method: string;
  outcome: string;
  notes: string | null;
};

export type StaffDay = {
  staff: { id: string; name: string; role: string };
  day: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  /** Minutes between the first clock in and the last clock out. */
  workedMinutes: number | null;
  remarks: string | null;
  issues: string | null;
  /** Whether they have actually filed one, as opposed to this being derived. */
  filed: boolean;
  classes: DayClass[];
  contacts: DayContact[];
  /** Distinct leads reached, which is what a target of "call 10" means. */
  leadsReached: number;
  outcomeCounts: Record<string, number>;
};

export async function getStaffDay(staffId: string, day: Date): Promise<StaffDay | null> {
  const dayStart = startOfGymDay(day);
  const dayEnd = endOfGymDay(day);
  const sessionWindow = sessionWindowFor(dayStart);

  const [staff, report, clockEvents, sessions, contacts] = await Promise.all([
    prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, role: true },
    }),
    prisma.dailyReport.findUnique({
      where: { staffId_day: { staffId, day: dayStart } },
    }),
    prisma.clockEvent.findMany({
      where: { staffId, at: { gte: dayStart, lte: dayEnd } },
      orderBy: { at: "asc" },
    }),
    // Sessions are stored as the wall clock that was typed, so the window for
    // them stays in that frame rather than moving to gym time.
    prisma.session.findMany({
      where: {
        trainerId: staffId,
        datetime: { gte: sessionWindow.start, lte: sessionWindow.end },
      },
      orderBy: { datetime: "asc" },
      select: {
        id: true,
        datetime: true,
        status: true,
        type: true,
        clientId: true,
        client: { select: { name: true } },
        lead: { select: { name: true } },
      },
    }),
    prisma.leadContactAttempt.findMany({
      where: { staffId, createdAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        leadId: true,
        method: true,
        outcome: true,
        notes: true,
        lead: { select: { name: true } },
      },
    }),
  ]);

  if (!staff) return null;

  const firstIn = clockEvents.find((e) => e.kind === "in")?.at ?? null;
  const lastOut = [...clockEvents].reverse().find((e) => e.kind === "out")?.at ?? null;

  const startedAt = report?.startedAt ?? firstIn;
  const endedAt = report?.endedAt ?? lastOut;

  const outcomeCounts: Record<string, number> = {};
  for (const c of contacts) outcomeCounts[c.outcome] = (outcomeCounts[c.outcome] ?? 0) + 1;

  return {
    staff,
    day: dayStart,
    startedAt,
    endedAt,
    workedMinutes:
      startedAt && endedAt
        ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000))
        : null,
    remarks: report?.remarks ?? null,
    issues: report?.issues ?? null,
    filed: report !== null,
    classes: sessions.map((s) => ({
      id: s.id,
      at: s.datetime,
      clientId: s.clientId,
      clientName: s.client?.name ?? s.lead?.name ?? "—",
      status: s.status,
      type: s.type,
    })),
    contacts: contacts.map((c) => ({
      id: c.id,
      at: c.createdAt,
      leadId: c.leadId,
      leadName: c.lead.name,
      method: c.method,
      outcome: c.outcome,
      notes: c.notes,
    })),
    leadsReached: new Set(contacts.map((c) => c.leadId)).size,
    outcomeCounts,
  };
}

/**
 * The window to look for sessions in, for the gym day starting at `dayStart`.
 *
 * Session datetimes carry the wall clock staff typed rather than a true
 * instant, so they can't be matched against the gym-time window the rest of
 * this uses. They have to be matched against the calendar date instead — and
 * that date has to come from the gym day's own key, because the instant that
 * opens a gym day falls on the previous date in UTC. Reading the fields off
 * that instant directly looked for a Tuesday's classes on the Monday.
 */
function sessionWindowFor(dayStart: Date) {
  const [year, month, date] = gymDayKey(dayStart).split("-").map(Number);
  return {
    start: new Date(year, month - 1, date, 0, 0, 0, 0),
    end: new Date(year, month - 1, date, 23, 59, 59, 999),
  };
}
