import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-helpers";
import { MANAGER_ROLES } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { getStaffDay } from "@/lib/daily-report";
import { gymDayFromKey, gymDayKey, startOfGymDay } from "@/lib/time";
import { DailyReportView } from "@/components/reports/daily-report-view";

/** One person's day, opened from the manager's list. */
export default async function StaffDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  await requireRole([...MANAGER_ROLES]);
  const { locale, t } = await getDictionary();
  const { staffId } = await params;
  const { day: dayParam } = await searchParams;

  const day = (dayParam ? gymDayFromKey(dayParam) : null) ?? startOfGymDay();
  const report = await getStaffDay(staffId, day);
  if (!report) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link
        href={`/reports/daily?day=${gymDayKey(day)}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t.dailyReports.backToList}
      </Link>

      <DailyReportView day={report} t={t.dailyReport} common={t.attendance} locale={locale} />
    </div>
  );
}
