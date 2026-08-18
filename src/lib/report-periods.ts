// Deliberately free of any database import: the period picker is a client
// component, and importing this from there must not drag Prisma into the
// browser bundle.
import {
  addGymDays,
  addGymMonths,
  endOfGymDay,
  endOfGymMonth,
  endOfGymWeek,
  endOfGymYear,
  startOfGymDay,
  startOfGymMonth,
  startOfGymWeek,
  startOfGymYear,
} from "@/lib/time";

export const REPORT_PERIODS = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "last_month",
  "last_30",
  "this_year",
  "all",
] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export function isReportPeriod(value: string | undefined): value is ReportPeriod {
  return !!value && (REPORT_PERIODS as readonly string[]).includes(value);
}

/**
 * Half-open [start, end) for a preset, on the gym's clock.
 *
 * These windows are matched against `Client.createdAt` and
 * `Package.purchaseDate`, both true instants, so the boundaries have to be
 * real instants too. Taking them from the server's own clock made "today" run
 * 3am to 3am, since Vercel runs on UTC and the gym does not.
 *
 * `all` has no start, which the queries treat as "everything up to now" rather
 * than substituting an arbitrary epoch.
 */
export function periodRange(period: ReportPeriod): { start: Date | null; end: Date } {
  const now = new Date();
  switch (period) {
    case "today":
      return { start: startOfGymDay(now), end: endOfGymDay(now) };
    case "yesterday": {
      const y = addGymDays(now, -1);
      return { start: startOfGymDay(y), end: endOfGymDay(y) };
    }
    case "this_week":
      return { start: startOfGymWeek(now), end: endOfGymWeek(now) };
    case "this_month":
      return { start: startOfGymMonth(now), end: endOfGymMonth(now) };
    case "last_month": {
      const m = addGymMonths(now, -1);
      return { start: startOfGymMonth(m), end: endOfGymMonth(m) };
    }
    case "last_30":
      return { start: startOfGymDay(addGymDays(now, -29)), end: endOfGymDay(now) };
    case "this_year":
      return { start: startOfGymYear(now), end: endOfGymYear(now) };
    case "all":
      return { start: null, end: now };
  }
}
