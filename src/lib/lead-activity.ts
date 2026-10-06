import { prisma } from "@/lib/db";
import { periodRange, type ReportPeriod } from "@/lib/report-periods";

/**
 * Who is working their leads, and who isn't.
 *
 * Counts attempts and the people behind them separately on purpose. Ten
 * attempts can be one lead rung ten times, which is not what "call ten a day"
 * asks for, so the figure that matters is how many different leads were
 * reached. Both are reported so the difference is visible rather than hidden
 * in an average.
 */
export type LeadActivityRow = {
  staff: { id: string; name: string; role: string };
  /** Open leads sitting with them right now. */
  assigned: number;
  /** Of those, how many have never been contacted by anyone. */
  neverContacted: number;
  attempts: number;
  leadsReached: number;
  outcomes: Record<string, number>;
  lastContactAt: Date | null;
  /** Days in the period on which they logged at least one contact. */
  activeDays: number;
};

const OPEN_LEAD_STATUSES = ["new", "contacted", "trial_scheduled", "trial_completed"];

export async function getLeadActivity(period: ReportPeriod): Promise<LeadActivityRow[]> {
  const { start, end } = periodRange(period);
  const window = start ? { gte: start, lte: end } : { lte: end };

  const [staff, attempts, assigned, uncontacted] = await Promise.all([
    // Everyone who could be working leads, so a trainer who did nothing still
    // appears with a zero rather than dropping off the report entirely.
    prisma.staff.findMany({
      where: { active: true, role: { in: ["trainer", "front_desk", "trainer_manager"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.leadContactAttempt.findMany({
      where: { createdAt: window },
      select: { staffId: true, leadId: true, outcome: true, createdAt: true },
    }),
    prisma.lead.groupBy({
      by: ["assignedStaffId"],
      where: { status: { in: OPEN_LEAD_STATUSES }, assignedStaffId: { not: null } },
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: {
        status: { in: OPEN_LEAD_STATUSES },
        assignedStaffId: { not: null },
        contactAttempts: { none: {} },
      },
      select: { assignedStaffId: true },
    }),
  ]);

  const assignedBy = new Map(assigned.map((a) => [a.assignedStaffId as string, a._count._all]));
  const neverBy = new Map<string, number>();
  for (const l of uncontacted) {
    const id = l.assignedStaffId as string;
    neverBy.set(id, (neverBy.get(id) ?? 0) + 1);
  }

  const byStaff = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = byStaff.get(a.staffId);
    if (list) list.push(a);
    else byStaff.set(a.staffId, [a]);
  }

  return staff.map((person) => {
    const mine = byStaff.get(person.id) ?? [];
    const outcomes: Record<string, number> = {};
    for (const a of mine) outcomes[a.outcome] = (outcomes[a.outcome] ?? 0) + 1;

    return {
      staff: person,
      assigned: assignedBy.get(person.id) ?? 0,
      neverContacted: neverBy.get(person.id) ?? 0,
      attempts: mine.length,
      leadsReached: new Set(mine.map((a) => a.leadId)).size,
      outcomes,
      lastContactAt: mine.reduce<Date | null>(
        (latest, a) => (latest === null || a.createdAt > latest ? a.createdAt : latest),
        null
      ),
      activeDays: new Set(mine.map((a) => a.createdAt.toISOString().slice(0, 10))).size,
    };
  });
}
