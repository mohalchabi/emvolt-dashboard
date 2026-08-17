// Deliberately free of any database import: the period picker is a client
// component, and importing this from there must not drag Prisma into the
// browser bundle.
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subDays,
} from "date-fns";

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
 * Half-open [start, end) for a preset, in the server's local time so "today"
 * means today at the gym. `all` has no start, which the queries treat as
 * "everything up to now" rather than substituting an arbitrary epoch.
 */
export function periodRange(period: ReportPeriod): { start: Date | null; end: Date } {
  const now = new Date();
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const m = subMonths(now, 1);
      return { start: startOfMonth(m), end: endOfMonth(m) };
    }
    case "last_30":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "all":
      return { start: null, end: now };
  }
}

