import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { MANAGER_ROLES, label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { getStaffDay } from "@/lib/daily-report";
import { gymDayFromKey, gymDayKey, startOfGymDay, formatGymDate, formatGymTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPicker } from "@/components/attendance/day-picker";

/**
 * Everyone's day, for whoever has to ask why it went the way it did.
 *
 * Built from the staff list rather than from filed reports, so someone who
 * worked and never filed shows up as a gap instead of being invisible — the
 * same reason the attendance view is built that way.
 */
export default async function DailyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  await requireRole([...MANAGER_ROLES]);
  const { locale, t } = await getDictionary();
  const c = t.dailyReports;

  const { day: dayParam } = await searchParams;
  const day = (dayParam ? gymDayFromKey(dayParam) : null) ?? startOfGymDay();
  const dayKey = gymDayKey(day);
  const isToday = dayKey === gymDayKey(new Date());

  const staff = await prisma.staff.findMany({
    where: { active: true, role: { in: ["trainer", "front_desk", "trainer_manager"] } },
    select: { id: true },
    orderBy: { name: "asc" },
  });

  const days = (await Promise.all(staff.map((s) => getStaffDay(s.id, day)))).filter(
    (d): d is NonNullable<typeof d> => d !== null
  );
  // Anyone who did something comes first; the people with an empty day are
  // what the page is for, so they sit at the bottom where they stand out.
  const ranked = [...days].sort(
    (a, b) => Number(b.filed) - Number(a.filed) || b.classes.length - a.classes.length
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {c.backToReports}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      <DayPicker day={dayKey} isToday={isToday} t={t.attendance} />

      <div className="flex flex-col gap-3">
        {ranked.map((d) => (
          <Card key={d.staff.id}>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <CardTitle className="text-base">
                  <bdi>{d.staff.name}</bdi>
                </CardTitle>
                <span className="text-xs text-muted-foreground">{label(d.staff.role, locale)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {d.filed ? (
                  <Badge variant="secondary">{c.filed}</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/60 text-amber-400">
                    {c.notFiled}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false} render={<Link href={`/reports/daily/${d.staff.id}?day=${dayKey}`} />}
                >
                  <FileText className="size-4" />
                  {c.open}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>
                {c.shift}{" "}
                <bdi className="font-medium text-foreground tabular-nums">
                  {d.startedAt ? formatGymTime(d.startedAt, locale) : "—"}
                  {" → "}
                  {d.endedAt ? formatGymTime(d.endedAt, locale) : "—"}
                </bdi>
              </span>
              <span>
                {c.classes}{" "}
                <bdi className="font-medium text-foreground tabular-nums">{d.classes.length}</bdi>
              </span>
              <span>
                {c.leads}{" "}
                <bdi
                  className={`font-medium tabular-nums ${
                    d.leadsReached === 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {d.leadsReached}
                </bdi>
              </span>
              {d.issues?.trim() && (
                <Badge variant="outline" className="border-destructive/60 text-destructive">
                  {c.hasIssue}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {c.dayNote.replace("{date}", formatGymDate(day, locale))}
      </p>
    </div>
  );
}
