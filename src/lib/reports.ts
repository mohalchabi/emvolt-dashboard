import { eachDayOfInterval, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { roundMoney } from "@/lib/wallet";
import { periodRange, type ReportPeriod } from "@/lib/report-periods";

export { REPORT_PERIODS, isReportPeriod, periodRange } from "@/lib/report-periods";
export type { ReportPeriod } from "@/lib/report-periods";

function within(start: Date | null, end: Date) {
  return start ? { gte: start, lte: end } : { lte: end };
}

export type ReportTotals = {
  /** Customers who signed up in the period, counted by when they joined. */
  newClients: number;
  /** Everything sold in the period, counted by purchase date. */
  revenue: number;
  /** The share of that from people who were already customers. */
  renewalRevenue: number;
  /** The share from packages sold to someone new to the studio. */
  newRevenue: number;
  packagesSold: number;
  renewalsSold: number;
  /** Sales per day, oldest first, for the chart. */
  series: { date: string; revenue: number; newClients: number }[];
  byPaymentMethod: { method: string; revenue: number; count: number }[];
  byPackage: { name: string; revenue: number; count: number }[];
  /** Acquisition for the same window, so the funnel and the money line up. */
  leadsCreated: number;
  leadsConverted: number;
  leadsBySource: { source: string; count: number }[];
};

/**
 * Money is counted by `Package.purchaseDate` and customers by
 * `Client.createdAt`, so the two answer different questions on purpose: a
 * renewal is revenue this month without being a new customer this month.
 * That split is the whole point of the report, so renewals are reported
 * alongside the total rather than folded into it.
 */
export async function getReportTotals(period: ReportPeriod): Promise<ReportTotals> {
  const { start, end } = periodRange(period);

  const [newClients, packages, clientsInPeriod, leadsCreated, leadsConverted, leadSources] =
    await Promise.all([
    prisma.client.count({ where: { createdAt: within(start, end) } }),
    prisma.package.findMany({
      where: { purchaseDate: within(start, end) },
      select: {
        price: true,
        purchaseDate: true,
        isRenewal: true,
        paymentMethod: true,
        name: true,
      },
      orderBy: { purchaseDate: "asc" },
    }),
      prisma.client.findMany({
        where: { createdAt: within(start, end) },
        select: { createdAt: true },
      }),
      prisma.lead.count({ where: { createdAt: within(start, end) } }),
      // Counted by when the lead arrived, not when it converted, so the
      // conversion rate compares like with like against leadsCreated.
      prisma.lead.count({ where: { createdAt: within(start, end), status: "converted" } }),
      prisma.lead.groupBy({
        by: ["source"],
        where: { createdAt: within(start, end) },
        _count: { _all: true },
      }),
    ]);

  const revenue = roundMoney(packages.reduce((s, p) => s + p.price, 0));
  const renewalRevenue = roundMoney(
    packages.filter((p) => p.isRenewal).reduce((s, p) => s + p.price, 0)
  );

  // Day buckets only make sense over a bounded window; for "all" the series
  // would be mostly empty days, so it spans the data instead.
  const seriesStart = start ?? packages[0]?.purchaseDate ?? end;
  const days =
    seriesStart <= end ? eachDayOfInterval({ start: startOfDay(seriesStart), end: startOfDay(end) }) : [];
  const cappedDays = days.length > 370 ? days.slice(days.length - 370) : days;

  const revenueByDay = new Map<string, number>();
  for (const p of packages) {
    const key = format(p.purchaseDate, "yyyy-MM-dd");
    revenueByDay.set(key, roundMoney((revenueByDay.get(key) ?? 0) + p.price));
  }
  const clientsByDay = new Map<string, number>();
  for (const c of clientsInPeriod) {
    const key = format(c.createdAt, "yyyy-MM-dd");
    clientsByDay.set(key, (clientsByDay.get(key) ?? 0) + 1);
  }

  const series = cappedDays.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return {
      date: key,
      revenue: revenueByDay.get(key) ?? 0,
      newClients: clientsByDay.get(key) ?? 0,
    };
  });

  const byMethod = new Map<string, { revenue: number; count: number }>();
  for (const p of packages) {
    const key = p.paymentMethod ?? "unknown";
    const cur = byMethod.get(key) ?? { revenue: 0, count: 0 };
    byMethod.set(key, { revenue: roundMoney(cur.revenue + p.price), count: cur.count + 1 });
  }

  const byName = new Map<string, { revenue: number; count: number }>();
  for (const p of packages) {
    const cur = byName.get(p.name) ?? { revenue: 0, count: 0 };
    byName.set(p.name, { revenue: roundMoney(cur.revenue + p.price), count: cur.count + 1 });
  }

  return {
    newClients,
    revenue,
    renewalRevenue,
    newRevenue: roundMoney(revenue - renewalRevenue),
    packagesSold: packages.length,
    renewalsSold: packages.filter((p) => p.isRenewal).length,
    series,
    byPaymentMethod: [...byMethod.entries()]
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
    byPackage: [...byName.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    leadsCreated,
    leadsConverted,
    leadsBySource: leadSources
      .map((row) => ({ source: row.source, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}
