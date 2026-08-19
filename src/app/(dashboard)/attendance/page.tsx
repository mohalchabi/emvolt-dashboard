import { MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { isManagerRole, label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { currentClockState } from "@/lib/actions/attendance";
import {
  endOfGymDay,
  formatGymDate,
  formatGymTime,
  gymDayFromKey,
  gymDayKey,
  startOfGymDay,
} from "@/lib/time";
import { formatWorked, summariseDay, type StaffDay } from "@/lib/attendance-summary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClockCard } from "@/components/attendance/clock-card";
import { DayPicker } from "@/components/attendance/day-picker";
import type { Dictionary } from "@/lib/i18n";

/** Opens the recorded position in whatever map app the device has. */
function mapHref(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

const STATUS_STYLES: Record<StaffDay["status"], string> = {
  working: "border-emerald-500/60 text-emerald-400",
  done: "border-border text-muted-foreground",
  missing_out: "border-amber-500/60 text-amber-400",
  absent: "border-destructive/60 text-destructive",
};

function statusText(status: StaffDay["status"], c: Dictionary["attendance"]) {
  if (status === "working") return c.working;
  if (status === "done") return c.finished;
  if (status === "missing_out") return c.missingOut;
  return c.notClockedIn;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await requireSession();
  const { locale, t } = await getDictionary();
  const c = t.attendance;
  const isManager = isManagerRole(session.user.role);

  const { day: dayParam } = await searchParams;
  // An unparseable day falls back to today rather than erroring, since this
  // value comes straight off the URL.
  const dayStart = (dayParam ? gymDayFromKey(dayParam) : null) ?? startOfGymDay();
  const dayEnd = endOfGymDay(dayStart);
  const dayKey = gymDayKey(dayStart);
  const isToday = dayKey === gymDayKey(new Date());

  const [{ isClockedIn, last }, mine, teamStaff, teamEvents] = await Promise.all([
    currentClockState(session.user.id),
    prisma.clockEvent.findMany({
      where: { staffId: session.user.id },
      orderBy: { at: "desc" },
      take: 20,
    }),
    // Driven by the staff list, not by the events, so people who never clocked
    // in still get a row. That absence is the thing a manager is looking for.
    isManager
      ? prisma.staff.findMany({
          where: { active: true },
          select: { id: true, name: true, role: true },
          orderBy: [{ role: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    isManager
      ? prisma.clockEvent.findMany({
          where: { at: { gte: dayStart, lte: dayEnd } },
          orderBy: { at: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const team = isManager
    ? summariseDay({ staff: teamStaff, events: teamEvents, dayStart, dayEnd })
    : [];
  const clockedIn = team.filter((row) => row.status !== "absent").length;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      <ClockCard
        isClockedIn={isClockedIn}
        sinceLabel={isClockedIn && last ? formatGymTime(last.at, locale) : null}
        t={c}
        locale={locale}
      />

      {isManager && (
        <Card>
          <CardHeader className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{isToday ? c.teamToday : c.team}</CardTitle>
              <Badge variant="secondary" className="tabular-nums">
                {c.clockedInCount
                  .replace("{done}", String(clockedIn))
                  .replace("{total}", String(team.length))}
              </Badge>
            </div>
            <DayPicker day={dayKey} isToday={isToday} t={c} />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {team.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noStaff}</p>
            ) : (
              team.map((row) => {
                const firstInEvent = row.events.find((e) => e.kind === "in");
                return (
                  <div
                    key={row.staff.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium">
                          <bdi>{row.staff.name}</bdi>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {label(row.staff.role, locale)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.departureReason && (
                          <Badge variant="outline" className="border-amber-500/60 text-amber-400">
                            {label(row.departureReason, locale)}
                          </Badge>
                        )}
                        <Badge variant="outline" className={STATUS_STYLES[row.status]}>
                          {statusText(row.status, c)}
                        </Badge>
                      </div>
                    </div>

                    {row.status !== "absent" && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {c.firstIn}{" "}
                          <bdi className="text-foreground tabular-nums">
                            {row.firstIn ? formatGymTime(row.firstIn, locale) : "—"}
                          </bdi>
                        </span>
                        <span>
                          {c.lastOut}{" "}
                          <bdi className="text-foreground tabular-nums">
                            {row.lastOut ? formatGymTime(row.lastOut, locale) : "—"}
                          </bdi>
                        </span>
                        <span>
                          {c.worked}{" "}
                          <bdi className="text-foreground tabular-nums">
                            {formatWorked(row.workedMinutes, c.hoursShort, c.minutesShort)}
                          </bdi>
                          {row.status === "working" && ` (${c.stillOnShift})`}
                        </span>
                        {firstInEvent && (
                          <a
                            href={mapHref(firstInEvent.latitude, firstInEvent.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                          >
                            <MapPin className="size-3" />
                            {firstInEvent.accuracy
                              ? `±${Math.round(firstInEvent.accuracy)}${c.metres}`
                              : c.viewLocation}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{c.myRecent}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.noEvents}</p>
          ) : (
            mine.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={e.kind === "in" ? "default" : "secondary"}>
                    {e.kind === "in" ? c.in : c.out}
                  </Badge>
                  <span className="text-muted-foreground">
                    <bdi>{formatGymDate(e.at, locale)}</bdi> · <bdi>{formatGymTime(e.at, locale)}</bdi>
                  </span>
                  {e.departureReason && (
                    <Badge variant="outline" className="border-amber-500/60 text-amber-400">
                      {label(e.departureReason, locale)}
                    </Badge>
                  )}
                </div>
                <a
                  href={mapHref(e.latitude, e.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  <MapPin className="size-3" />
                  {e.accuracy ? `±${Math.round(e.accuracy)}${c.metres}` : c.viewLocation}
                </a>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
