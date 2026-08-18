import { MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { isManagerRole, label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { currentClockState } from "@/lib/actions/attendance";
import { formatGymDate, formatGymTime, startOfGymDay } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClockCard } from "@/components/attendance/clock-card";

/** Opens the recorded position in whatever map app the device has. */
function mapHref(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default async function AttendancePage() {
  const session = await requireSession();
  const { locale, t } = await getDictionary();
  const c = t.attendance;
  const isManager = isManagerRole(session.user.role);

  const [{ isClockedIn, last }, mine, team] = await Promise.all([
    currentClockState(session.user.id),
    prisma.clockEvent.findMany({
      where: { staffId: session.user.id },
      orderBy: { at: "desc" },
      take: 20,
    }),
    isManager
      ? prisma.clockEvent.findMany({
          where: { at: { gte: startOfGymDay() } },
          include: { staff: { select: { id: true, name: true, role: true } } },
          orderBy: { at: "desc" },
        })
      : Promise.resolve([]),
  ]);

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

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle>{c.teamToday}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {team.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noneToday}</p>
            ) : (
              team.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium">
                      <bdi>{e.staff.name}</bdi>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {label(e.staff.role, locale)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.departureReason && (
                      <Badge variant="outline" className="border-amber-500/60 text-amber-400">
                        {label(e.departureReason, locale)}
                      </Badge>
                    )}
                    <Badge variant={e.kind === "in" ? "default" : "secondary"}>
                      {e.kind === "in" ? c.in : c.out}
                    </Badge>
                    <span className="text-muted-foreground">
                      <bdi>{formatGymTime(e.at, locale)}</bdi>
                    </span>
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
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
