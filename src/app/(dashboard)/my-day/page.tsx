import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { getDictionary } from "@/lib/i18n";
import { getStaffDay } from "@/lib/daily-report";
import { gymDayFromKey, gymDayKey, startOfGymDay } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { DailyReportView } from "@/components/reports/daily-report-view";

/**
 * A trainer's own day, theirs to read and send on.
 *
 * It exists for every day whether or not they filed anything, because the
 * classes and the calls are already recorded — what clocking out adds is their
 * account of it. Opening an unfiled day still shows what the records say.
 */
export default async function MyDayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await requireSession();
  const { locale, t } = await getDictionary();
  const { day: dayParam } = await searchParams;

  const day = (dayParam ? gymDayFromKey(dayParam) : null) ?? startOfGymDay();
  const dayKey = gymDayKey(day);
  const isToday = dayKey === gymDayKey(new Date());

  const report = await getStaffDay(session.user.id, day);
  if (!report) return null;

  const shift = (days: number) => {
    const d = new Date(`${dayKey}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return `/my-day?day=${d.toISOString().slice(0, 10)}`;
  };

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" render={<Link href={shift(-1)} />} aria-label={t.dailyReport.previousDay}>
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isToday}
          render={isToday ? <span /> : <Link href={shift(1)} />}
          aria-label={t.dailyReport.nextDay}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </Button>
        {!isToday && (
          <Button variant="ghost" size="sm" render={<Link href="/my-day" />}>
            {t.dailyReport.today}
          </Button>
        )}
      </div>

      <DailyReportView day={report} t={t.dailyReport} common={t.attendance} locale={locale} />

      {!report.filed && (
        <p className="rounded-md border-s-4 border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm print:hidden">
          {t.dailyReport.notFiledYet}
        </p>
      )}
    </div>
  );
}
