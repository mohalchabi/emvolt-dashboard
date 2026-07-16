import Link from "next/link";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { CalendarClock, Users2, Clock3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getRenewalAlerts } from "@/lib/kpi";
import { label } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RenewalAlertsCard } from "@/components/dashboard/renewal-alerts-list";
import type { Dictionary, Locale } from "@/lib/i18n";

export async function TrainerHome({
  trainerId,
  trainerName,
  t,
  locale,
}: {
  trainerId: string;
  trainerName: string;
  t: Dictionary;
  locale: Locale;
}) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const [todaySessions, weekSessionCount, clientCount, renewalAlerts] = await Promise.all([
    prisma.session.findMany({
      where: {
        trainerId,
        datetime: { gte: todayStart, lte: todayEnd },
        status: { not: "cancelled" },
      },
      include: { lead: true, client: true },
      orderBy: { datetime: "asc" },
    }),
    prisma.session.count({
      where: { trainerId, datetime: { gte: weekStart, lte: weekEnd }, status: { not: "cancelled" } },
    }),
    prisma.client.count({ where: { assignedTrainerId: trainerId, status: "active" } }),
    getRenewalAlerts(trainerId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t.trainerHome.welcome} {trainerName}
        </h1>
        <p className="text-sm text-muted-foreground">{t.trainerHome.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={t.trainerHome.sessionsToday} value={todaySessions.length} icon={CalendarClock} tone="primary" />
        <StatTile label={t.trainerHome.sessionsThisWeek} value={weekSessionCount} icon={Clock3} tone="primary" />
        <StatTile label={t.trainerHome.activeClients} value={clientCount} icon={Users2} tone="primary" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.trainerHome.todaysSchedule}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {todaySessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t.trainerHome.noSessionsToday}</p>
            ) : (
              todaySessions.map((s) => {
                const name = s.lead?.name ?? s.client?.name ?? "Unknown";
                const href = s.lead ? `/leads/${s.lead.id}` : `/clients/${s.clientId}`;
                return (
                  <Link
                    key={s.id}
                    href={href}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span className="truncate font-medium">{name}</span>
                    <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {label(s.type, locale)}
                      </Badge>
                      <span>{s.datetime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <RenewalAlertsCard alerts={renewalAlerts} t={t.renewalAlerts} />
      </div>
    </div>
  );
}
