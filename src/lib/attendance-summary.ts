/**
 * Turns a day's raw clock events into one row per person.
 *
 * The raw events answer "who clocked in", which is the easy half. A manager
 * also needs "who didn't", so this is driven by the staff list rather than by
 * the events: everyone active gets a row, and an empty one is the answer.
 */

export type ClockEventLike = {
  id: string;
  staffId: string;
  kind: string;
  at: Date;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  departureReason: string | null;
};

export type StaffLike = {
  id: string;
  name: string;
  role: string;
};

export type AttendanceStatus =
  /** No events at all on this day. */
  | "absent"
  /** Clocked in and hasn't clocked out, on a day still running. */
  | "working"
  /** Clocked in and out. */
  | "done"
  /** Clocked in on a day that has ended, with no clock out. */
  | "missing_out";

export type StaffDay = {
  staff: StaffLike;
  status: AttendanceStatus;
  firstIn: Date | null;
  lastOut: Date | null;
  /** Time on the clock, counting an open shift up to `now`. */
  workedMinutes: number;
  /** Whatever reason was given on the last clock out. */
  departureReason: string | null;
  events: ClockEventLike[];
};

/**
 * Pairs each clock in with the clock out that follows it.
 *
 * Two shapes come from real use rather than from bad data, and both are
 * handled instead of being allowed to produce a nonsense total: an out with no
 * in belongs to a shift that began before midnight, so it counts from the
 * start of the day; an in with no out is either still running or was
 * forgotten, which the status distinguishes.
 */
function workedMinutesFor(
  events: ClockEventLike[],
  dayStart: Date,
  dayEnd: Date,
  now: Date
): { minutes: number; openSince: Date | null } {
  let total = 0;
  let openSince: Date | null = null;

  for (const e of events) {
    if (e.kind === "in") {
      // A second clock in without an out in between can't add time twice.
      if (openSince === null) openSince = e.at;
    } else if (e.kind === "out") {
      const from = openSince ?? dayStart;
      total += Math.max(0, e.at.getTime() - from.getTime());
      openSince = null;
    }
  }

  if (openSince !== null && now < dayEnd) {
    // A shift still running accrues up to now. One left open on a day that has
    // already ended does not: running it to midnight would report a forgotten
    // clock out as a fifteen hour shift, which reads as fact rather than as
    // the mistake it is. The status says what happened instead.
    total += Math.max(0, now.getTime() - openSince.getTime());
  }

  return { minutes: Math.round(total / 60_000), openSince };
}

export function summariseDay({
  staff,
  events,
  dayStart,
  dayEnd,
  now = new Date(),
}: {
  staff: StaffLike[];
  events: ClockEventLike[];
  dayStart: Date;
  dayEnd: Date;
  now?: Date;
}): StaffDay[] {
  const byStaff = new Map<string, ClockEventLike[]>();
  for (const e of events) {
    const list = byStaff.get(e.staffId);
    if (list) list.push(e);
    else byStaff.set(e.staffId, [e]);
  }

  const dayIsOver = now > dayEnd;

  return staff.map((person) => {
    const mine = (byStaff.get(person.id) ?? [])
      .slice()
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    const ins = mine.filter((e) => e.kind === "in");
    const outs = mine.filter((e) => e.kind === "out");
    const { minutes, openSince } = workedMinutesFor(mine, dayStart, dayEnd, now);

    let status: AttendanceStatus;
    if (mine.length === 0) status = "absent";
    else if (openSince !== null) status = dayIsOver ? "missing_out" : "working";
    else status = "done";

    return {
      staff: person,
      status,
      firstIn: ins[0]?.at ?? null,
      lastOut: outs.at(-1)?.at ?? null,
      workedMinutes: minutes,
      departureReason: outs.at(-1)?.departureReason ?? null,
      events: mine,
    };
  });
}

/** `7h 30m`, or `45m` under an hour, using the caller's short units. */
export function formatWorked(minutes: number, hoursUnit: string, minutesUnit: string): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}${minutesUnit}`;
  return `${h}${hoursUnit} ${m}${minutesUnit}`;
}
