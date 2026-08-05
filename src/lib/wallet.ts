// Shared helpers for the wallet ledger. Imported from both server components
// and client components, so this file must stay free of server-only imports.

// Amounts are stored as Float (matching Package.price), which means summing a
// column can surface artifacts like 449.99999999999994. Every total is pushed
// through this before it's compared or displayed.
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatAmount(amount: number): string {
  return roundMoney(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSar(amount: number): string {
  return `${formatAmount(amount)} SAR`;
}

// Wallet dates are calendar dates, not instants: an <input type="date"> gives
// "YYYY-MM-DD" and we pin it to UTC midnight so the stored value is the same
// day no matter where the server runs. formatDate() reads it back in UTC for
// the same reason — using the server's local zone would slide the displayed
// day by one in any negative-offset region.
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "YYYY-MM" for the month a date falls in, in UTC. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function isMonthKey(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Half-open [start, end) range covering a "YYYY-MM" month, in UTC. */
export function monthRange(key: string): { start: Date; end: Date } {
  const [year, month] = key.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function formatMonth(key: string): string {
  return monthRange(key).start.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

/**
 * Every month from the earliest entry through the current one, newest first,
 * so the period picker offers real months rather than an open-ended calendar.
 */
export function monthOptions(earliest: Date | null): string[] {
  const now = new Date();
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = earliest
    ? new Date(Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1))
    : current;

  const keys: string[] = [];
  const cursor = new Date(from);
  while (cursor <= current) {
    keys.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys.reverse();
}
