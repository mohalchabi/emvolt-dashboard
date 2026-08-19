"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";

/**
 * Steps the team view through days.
 *
 * The day is carried in the URL rather than in state so the page stays a
 * server component and a manager can bookmark or share a particular day.
 */
export function DayPicker({
  day,
  isToday,
  t,
}: {
  /** `yyyy-MM-dd` on the gym's calendar. */
  day: string;
  isToday: boolean;
  t: Dictionary["attendance"];
}) {
  const router = useRouter();

  function go(to: string) {
    router.push(`/attendance?day=${to}`);
  }

  function shift(days: number) {
    // Parsed as UTC so the arithmetic can't be nudged across a boundary by
    // whatever zone the viewer's device is in.
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    go(d.toISOString().slice(0, 10));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" aria-label={t.previousDay} onClick={() => shift(-1)}>
        <ChevronLeft className="size-4 rtl:rotate-180" />
      </Button>

      <input
        type="date"
        value={day}
        onChange={(e) => e.target.value && go(e.target.value)}
        aria-label={t.pickDay}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <Button
        variant="outline"
        size="sm"
        aria-label={t.nextDay}
        disabled={isToday}
        onClick={() => shift(1)}
      >
        <ChevronRight className="size-4 rtl:rotate-180" />
      </Button>

      {!isToday && (
        <Button variant="ghost" size="sm" onClick={() => go(todayKey())}>
          {t.today}
        </Button>
      )}
    </div>
  );
}

/** Today on the gym's calendar, read from the browser's own clock. */
function todayKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}
