import Link from "next/link";
import { CalendarClock, Users, ClipboardList, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  getActiveClientsBySection,
  getWeekSessionStats,
  getUpcomingTrials,
  getRenewalAlerts,
} from "@/lib/kpi";
import { StatTile } from "@/components/dashboard/stat-tile";
import { UpcomingTrialsCard } from "@/components/dashboard/upcoming-trials-list";
import { RenewalAlertsCard } from "@/components/dashboard/renewal-alerts-list";
import type { Dictionary } from "@/lib/i18n";

// Front desk doesn't get the full lead-pipeline view (funnel, source
// breakdown, staff leaderboard, stale-lead list) — the admin distributes
// leads weekly and works the full list; front desk works only what's
// assigned to them via /my-leads.
export async function FrontDeskHome({
  staffId,
  staffName,
  t,
}: {
  staffId: string;
  staffName: string;
  t: Dictionary;
}) {
  const [myOpenLeads, activeClientsBySection, weekSessions, upcomingTrials, renewalAlerts] =
    await Promise.all([
      prisma.lead.count({
        where: { assignedStaffId: staffId, status: { notIn: ["converted", "lost"] } },
      }),
      getActiveClientsBySection(),
      getWeekSessionStats(),
      getUpcomingTrials(),
      getRenewalAlerts(),
    ]);

  const activeClients = Object.values(activeClientsBySection).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t.frontDeskHome.welcome} {staffName}
        </h1>
        <p className="text-sm text-muted-foreground">{t.frontDeskHome.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/my-leads" className="block">
          <StatTile label={t.frontDeskHome.myOpenLeads} value={myOpenLeads} icon={ClipboardList} tone="primary" />
        </Link>
        <StatTile label={t.frontDeskHome.activeClients} value={activeClients} icon={Users} tone="primary" />
        <StatTile
          label={t.frontDeskHome.trialsToday}
          value={upcomingTrials.todayCount}
          sublabel={`${upcomingTrials.weekCount} ${t.common.thisWeek}`}
          icon={CalendarClock}
          tone="primary"
        />
        <StatTile
          label={t.frontDeskHome.completedThisWeek}
          value={weekSessions.completed}
          icon={CheckCircle2}
          tone="good"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingTrialsCard data={upcomingTrials} t={t.upcomingTrials} common={t.common} />
        <RenewalAlertsCard alerts={renewalAlerts} t={t.renewalAlerts} />
      </div>
    </div>
  );
}
