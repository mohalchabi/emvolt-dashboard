/**
 * Times shown to staff are the gym's wall clock, never the server's.
 *
 * Vercel runs functions on UTC, so anything formatted server side with the
 * plain `toLocaleTimeString` came out three hours behind Riyadh. Every helper
 * here pins the zone explicitly so the answer no longer depends on which
 * machine happened to render the page.
 */
export const GYM_TIME_ZONE = "Asia/Riyadh";

function intlLocale(locale: string) {
  return locale === "ar" ? "ar-SA" : "en-GB";
}

/**
 * Minutes the gym's clock runs ahead of UTC at the given instant.
 *
 * Read back from `Intl` rather than hard coded, so the zone's own rules decide.
 * Riyadh has never observed daylight saving, so in practice this is a steady
 * +180, but nothing here assumes that.
 */
function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GYM_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Some ICU builds render midnight as hour 24 under hour12:false.
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  // Drop sub-second precision on both sides so the difference is a clean offset.
  return Math.round((asIfUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

/**
 * The same instant with its UTC fields shifted to read as the gym's wall clock.
 * Only for doing calendar arithmetic; never store or display one of these.
 */
function toGymFields(at: Date): Date {
  return new Date(at.getTime() + offsetMinutes(at) * 60_000);
}

/** Turns gym wall-clock fields back into the real instant they name. */
function fromGymFields(shifted: Date): Date {
  // The offset barely moves, so resolving it once against the shifted value and
  // once against the result agrees except across a transition Riyadh never has.
  const guess = new Date(shifted.getTime() - offsetMinutes(shifted) * 60_000);
  return new Date(shifted.getTime() - offsetMinutes(guess) * 60_000);
}

/** Midnight at the gym, as a real instant. */
export function startOfGymDay(at: Date = new Date()): Date {
  const fields = toGymFields(at);
  fields.setUTCHours(0, 0, 0, 0);
  return fromGymFields(fields);
}

/** The last millisecond of the gym's day, as a real instant. */
export function endOfGymDay(at: Date = new Date()): Date {
  const fields = toGymFields(at);
  fields.setUTCHours(23, 59, 59, 999);
  return fromGymFields(fields);
}

/** Midnight on the Sunday that opens the gym's week. */
export function startOfGymWeek(at: Date = new Date()): Date {
  const fields = toGymFields(at);
  fields.setUTCDate(fields.getUTCDate() - fields.getUTCDay());
  fields.setUTCHours(0, 0, 0, 0);
  return fromGymFields(fields);
}

export function endOfGymWeek(at: Date = new Date()): Date {
  const start = toGymFields(startOfGymWeek(at));
  start.setUTCDate(start.getUTCDate() + 6);
  start.setUTCHours(23, 59, 59, 999);
  return fromGymFields(start);
}

export function startOfGymMonth(at: Date = new Date()): Date {
  const fields = toGymFields(at);
  fields.setUTCDate(1);
  fields.setUTCHours(0, 0, 0, 0);
  return fromGymFields(fields);
}

export function endOfGymMonth(at: Date = new Date()): Date {
  const fields = toGymFields(at);
  fields.setUTCMonth(fields.getUTCMonth() + 1, 1);
  fields.setUTCHours(0, 0, 0, 0);
  return new Date(fromGymFields(fields).getTime() - 1);
}

export function startOfGymYear(at: Date = new Date()): Date {
  const fields = toGymFields(at);
  fields.setUTCMonth(0, 1);
  fields.setUTCHours(0, 0, 0, 0);
  return fromGymFields(fields);
}

export function endOfGymYear(at: Date = new Date()): Date {
  const fields = toGymFields(at);
  fields.setUTCFullYear(fields.getUTCFullYear() + 1, 0, 1);
  fields.setUTCHours(0, 0, 0, 0);
  return new Date(fromGymFields(fields).getTime() - 1);
}

/** Shifts by whole gym days, keeping the time of day across any transition. */
export function addGymDays(at: Date, days: number): Date {
  const fields = toGymFields(at);
  fields.setUTCDate(fields.getUTCDate() + days);
  return fromGymFields(fields);
}

export function addGymMonths(at: Date, months: number): Date {
  const fields = toGymFields(at);
  fields.setUTCMonth(fields.getUTCMonth() + months);
  return fromGymFields(fields);
}

/** `yyyy-MM-dd` for the gym's day, for grouping and chart keys. */
export function gymDayKey(at: Date): string {
  const fields = toGymFields(at);
  return fields.toISOString().slice(0, 10);
}

/** Every gym day from `start` to `end` inclusive, as midnight instants. */
export function eachGymDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfGymDay(start);
  const last = startOfGymDay(end);
  while (cursor <= last) {
    days.push(cursor);
    cursor = startOfGymDay(addGymDays(cursor, 1));
  }
  return days;
}

/** `14:25` at the gym, whatever zone the server is in. */
export function formatGymTime(at: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: GYM_TIME_ZONE,
  }).format(at);
}

/** Short `18 Aug` style date at the gym. */
export function formatGymDate(at: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "short",
    timeZone: GYM_TIME_ZONE,
  }).format(at);
}
