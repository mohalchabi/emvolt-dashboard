import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// `date.toISOString().slice(0, 10)` is a common trap for a date-only value:
// toISOString() converts to UTC first, which shifts the calendar day for any
// non-UTC-positive timezone (e.g. local midnight in UTC+3 becomes the
// previous day in UTC). Use local getters instead for "YYYY-MM-DD" values
// like <input type="date"> or ?date= query params.
export function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
