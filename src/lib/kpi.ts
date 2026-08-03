import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { prisma } from "@/lib/db";
import { OPERATING_HOURS, LEAD_STATUSES } from "@/lib/constants";
import { packageBalances } from "@/lib/package-balance";

const FUNNEL_STAGES = LEAD_STATUSES.filter((s) => s !== "lost") as Exclude<
  (typeof LEAD_STATUSES)[number],
  "lost"
>[];

export async function getLeadFunnel() {
  const counts = await prisma.lead.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);
  const converted = byStatus["converted"] ?? 0;
  const lost = byStatus["lost"] ?? 0;

  return {
    total,
    stages: FUNNEL_STAGES.map((status) => ({ status, count: byStatus[status] ?? 0 })),
    converted,
    lost,
    conversionRate: total > 0 ? converted / total : 0,
    lostRate: total > 0 ? lost / total : 0,
  };
}

export async function getLeadsBySource() {
  const rows = await prisma.lead.groupBy({ by: ["source"], _count: { _all: true } });
  return rows
    .map((r) => ({ source: r.source, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getLostReasonBreakdown() {
  const rows = await prisma.lead.groupBy({
    by: ["lostReason"],
    where: { status: "lost" },
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ reason: r.lostReason ?? "other", count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getStaffLeaderboard() {
  // Aggregate at the database level instead of pulling every assigned lead
  // into memory — this stays fast regardless of how many leads exist.
  const byStatus = await prisma.lead.groupBy({
    by: ["assignedStaffId", "status"],
    where: { assignedStaffId: { not: null } },
    _count: { _all: true },
  });

  const staffIds = Array.from(new Set(byStatus.map((r) => r.assignedStaffId!)));
  const staffRows = await prisma.staff.findMany({ where: { id: { in: staffIds } } });
  const staffById = new Map(staffRows.map((s) => [s.id, s]));

  const byStaff = new Map<
    string,
    {
      staffId: string;
      name: string;
      target: number | null;
      total: number;
      contacted: number;
      notContacted: number;
      converted: number;
    }
  >();
  for (const row of byStatus) {
    const key = row.assignedStaffId!;
    const staff = staffById.get(key);
    if (!staff) continue;
    const entry = byStaff.get(key) ?? {
      staffId: key,
      name: staff.name,
      target: staff.leadTarget,
      total: 0,
      contacted: 0,
      notContacted: 0,
      converted: 0,
    };
    const count = row._count._all;
    entry.total += count;
    if (row.status === "new") entry.notContacted += count;
    else entry.contacted += count;
    if (row.status === "converted") entry.converted += count;
    byStaff.set(key, entry);
  }

  return Array.from(byStaff.values())
    .map((s) => ({ ...s, conversionRate: s.total > 0 ? s.converted / s.total : 0 }))
    .sort((a, b) => b.total - a.total);
}

export async function getFirstContactStats() {
  // Bounded to a recent window + a hard cap so this stays fast as lead volume
  // grows — an "all-time" average isn't a meaningful KPI anyway once the
  // history spans years.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3_600_000);
  const contactedLeads = await prisma.lead.findMany({
    where: { status: { not: "new" }, createdAt: { gte: ninetyDaysAgo } },
    include: { activityLogs: { orderBy: { createdAt: "asc" } } },
    take: 500,
  });

  const diffsHours: number[] = [];
  for (const lead of contactedLeads) {
    const firstRealLog = lead.activityLogs.find((l) => !l.text.startsWith("Lead created"));
    if (firstRealLog) {
      diffsHours.push((firstRealLog.createdAt.getTime() - lead.createdAt.getTime()) / 3_600_000);
    }
  }
  const avgHours = diffsHours.length
    ? diffsHours.reduce((a, b) => a + b, 0) / diffsHours.length
    : null;

  const staleNewLeads = await prisma.lead.findMany({
    where: { status: "new" },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  return { avgHours, staleNewLeads };
}

export async function getUpcomingTrials() {
  const now = new Date();
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const trials = await prisma.session.findMany({
    where: { type: "trial", status: "scheduled", datetime: { gte: now, lte: weekEnd } },
    include: { lead: true, trainer: true },
    orderBy: { datetime: "asc" },
  });

  return {
    trials,
    todayCount: trials.filter((t) => t.datetime <= todayEnd).length,
    weekCount: trials.length,
  };
}

export async function getActiveClientsBySection() {
  const rows = await prisma.client.groupBy({
    by: ["section"],
    where: { status: "active" },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.section, r._count._all])) as Record<
    string,
    number
  >;
}

export async function getWeekSessionStats() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 0 });
  const end = endOfWeek(now, { weekStartsOn: 0 });

  const rows = await prisma.session.groupBy({
    by: ["status"],
    where: { datetime: { gte: start, lte: end } },
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r._count._all]));

  return {
    scheduled: byStatus["scheduled"] ?? 0,
    completed: byStatus["completed"] ?? 0,
    cancelled: byStatus["cancelled"] ?? 0,
    noShow: byStatus["no_show"] ?? 0,
  };
}

export async function getRenewalAlerts(trainerId?: string) {
  const activePackages = await prisma.package.findMany({
    where: { client: { status: "active", ...(trainerId ? { assignedTrainerId: trainerId } : {}) } },
    include: { client: true },
  });
  const balances = await packageBalances(activePackages);

  return activePackages
    .map((pkg) => ({ pkg, balance: balances.get(pkg.id) ?? { used: 0, remaining: pkg.totalSessions } }))
    .filter((x) => x.balance.remaining <= 2)
    .sort((a, b) => a.balance.remaining - b.balance.remaining);
}

// Every staff action that touches a lead or client already writes an
// ActivityLog row (lead/client created, contacted, status changed, package
// sold, etc.) — this just surfaces the most recent of those org-wide so
// admins can see what trainers and front desk are doing without having to
// open each lead/client individually.
export async function getRecentActivity(limit = 15) {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: true,
      lead: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    authorName: log.author.name,
    text: log.text,
    createdAt: log.createdAt,
    target: log.lead
      ? { type: "lead" as const, id: log.lead.id, name: log.lead.name }
      : log.client
        ? { type: "client" as const, id: log.client.id, name: log.client.name }
        : null,
  }));
}

export async function getTrainerUtilization() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 0 });
  const end = endOfWeek(now, { weekStartsOn: 0 });
  const capacityMinutes = (OPERATING_HOURS.endHour - OPERATING_HOURS.startHour) * 60 * 7;

  const trainers = await prisma.staff.findMany({
    where: { active: true, role: "trainer" },
    orderBy: { name: "asc" },
  });
  const sessions = await prisma.session.findMany({
    where: {
      trainerId: { in: trainers.map((t) => t.id) },
      datetime: { gte: start, lte: end },
      status: { not: "cancelled" },
    },
  });

  return trainers
    .map((trainer) => {
      const booked = sessions
        .filter((s) => s.trainerId === trainer.id)
        .reduce((sum, s) => sum + s.duration, 0);
      return { trainer, pct: Math.round((booked / capacityMinutes) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);
}
