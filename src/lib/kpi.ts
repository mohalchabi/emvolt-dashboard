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
  const leads = await prisma.lead.findMany({
    where: { assignedStaffId: { not: null } },
    include: { assignedStaff: true },
  });

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
  for (const lead of leads) {
    if (!lead.assignedStaff) continue;
    const key = lead.assignedStaffId!;
    const entry = byStaff.get(key) ?? {
      staffId: key,
      name: lead.assignedStaff.name,
      target: lead.assignedStaff.leadTarget,
      total: 0,
      contacted: 0,
      notContacted: 0,
      converted: 0,
    };
    entry.total += 1;
    if (lead.status === "new") entry.notContacted += 1;
    else entry.contacted += 1;
    if (lead.status === "converted") entry.converted += 1;
    byStaff.set(key, entry);
  }

  return Array.from(byStaff.values())
    .map((s) => ({ ...s, conversionRate: s.total > 0 ? s.converted / s.total : 0 }))
    .sort((a, b) => b.total - a.total);
}

export async function getFirstContactStats() {
  const contactedLeads = await prisma.lead.findMany({
    where: { status: { not: "new" } },
    include: { activityLogs: { orderBy: { createdAt: "asc" } } },
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
