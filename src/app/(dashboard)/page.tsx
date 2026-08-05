import { Users, CheckCircle2, XCircle, Ban, CalendarClock } from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import {
  getLeadFunnel,
  getLeadsBySource,
  getLostReasonBreakdown,
  getStaffLeaderboard,
  getFirstContactStats,
  getUpcomingTrials,
  getActiveClientsBySection,
  getWeekSessionStats,
  getRenewalAlerts,
  getTrainerUtilization,
  getRecentActivity,
} from "@/lib/kpi";
import { label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { StatTile } from "@/components/dashboard/stat-tile";
import { LeadFunnelCard } from "@/components/dashboard/lead-funnel";
import { BarChartCard } from "@/components/dashboard/bar-chart-card";
import { StaffLeaderboardCard } from "@/components/dashboard/staff-leaderboard";
import { UpcomingTrialsCard } from "@/components/dashboard/upcoming-trials-list";
import { RenewalAlertsCard } from "@/components/dashboard/renewal-alerts-list";
import { StaleLeadsCard } from "@/components/dashboard/stale-leads-list";
import { RecentActivityCard } from "@/components/dashboard/recent-activity";
import { TrainerHome } from "@/components/dashboard/trainer-home";
import { FrontDeskHome } from "@/components/dashboard/front-desk-home";

export default async function DashboardHome() {
  const session = await requireSession();
  const { locale, t } = await getDictionary();

  if (session.user.role === "trainer") {
    return <TrainerHome trainerId={session.user.id} trainerName={session.user.name} t={t} locale={locale} />;
  }
  if (session.user.role === "front_desk") {
    return <FrontDeskHome staffId={session.user.id} staffName={session.user.name} t={t} />;
  }

  const [
    funnel,
    bySource,
    lostReasons,
    leaderboard,
    firstContact,
    upcomingTrials,
    activeClientsBySection,
    weekSessions,
    renewalAlerts,
    utilization,
    recentActivity,
  ] = await Promise.all([
    getLeadFunnel(),
    getLeadsBySource(),
    getLostReasonBreakdown(),
    getStaffLeaderboard(),
    getFirstContactStats(),
    getUpcomingTrials(),
    getActiveClientsBySection(),
    getWeekSessionStats(),
    getRenewalAlerts(),
    getTrainerUtilization(),
    getRecentActivity(),
  ]);

  const activeClients = Object.values(activeClientsBySection).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t.dashboardAdmin.title}</h1>
        <p className="text-sm text-muted-foreground">{t.dashboardAdmin.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label={t.dashboardAdmin.activeClients}
          value={activeClients}
          sublabel={`${activeClientsBySection.male ?? 0} ${label("male", locale)} · ${activeClientsBySection.female ?? 0} ${label("female", locale)}`}
          icon={Users}
          tone="primary"
        />
        <StatTile
          label={t.dashboardAdmin.completedThisWeek}
          value={weekSessions.completed}
          icon={CheckCircle2}
          tone="good"
        />
        <StatTile label={t.dashboardAdmin.noShowsThisWeek} value={weekSessions.noShow} icon={XCircle} tone="critical" />
        <StatTile label={t.dashboardAdmin.cancelledThisWeek} value={weekSessions.cancelled} icon={Ban} tone="warning" />
        <StatTile
          label={t.dashboardAdmin.trialsToday}
          value={upcomingTrials.todayCount}
          sublabel={`${upcomingTrials.weekCount} ${t.common.thisWeek}`}
          icon={CalendarClock}
          tone="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadFunnelCard funnel={funnel} t={t.leadFunnel} locale={locale} />
        </div>
        <StaleLeadsCard stats={firstContact} t={t.staleLeads} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t.dashboardAdmin.leadsBySource}
          data={bySource.map((r) => ({ name: label(r.source, locale), value: r.count }))}
        />
        <BarChartCard
          title={t.dashboardAdmin.lostReasonBreakdown}
          data={lostReasons.map((r) => ({ name: label(r.reason, locale), value: r.count }))}
          emptyMessage={t.dashboardAdmin.noLostLeadsYet}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StaffLeaderboardCard leaderboard={leaderboard} t={t.staffLeaderboard} />
        <BarChartCard
          title={t.dashboardAdmin.trainerUtilization}
          data={utilization.map((u) => ({ name: u.trainer.name, value: u.pct }))}
          unit="%"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingTrialsCard data={upcomingTrials} t={t.upcomingTrials} common={t.common} />
        <RenewalAlertsCard alerts={renewalAlerts} t={t.renewalAlerts} />
      </div>

      <RecentActivityCard activity={recentActivity} t={t.recentActivity} />
    </div>
  );
}
