import { Users2, Banknote, Repeat, Receipt, Target } from "lucide-react";
import { requireRole } from "@/lib/auth-helpers";
import { label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { formatSar } from "@/lib/wallet";
import { getReportTotals, isReportPeriod, type ReportPeriod } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ReportPeriodSelect } from "@/components/reports/period-select";
import { TrendChart } from "@/components/reports/trend-chart";
import { BarChartCard } from "@/components/dashboard/bar-chart-card";

/**
 * How many customers came in and how much money came with them, over a period.
 *
 * The two are counted differently on purpose — customers by when they signed
 * up, money by when a package was bought — so a renewal shows as revenue this
 * month without inflating the new-customer count. The split between new and
 * renewal revenue is printed rather than hidden, because "we took 40,000 this
 * month" means something different depending on which it was.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireRole(["admin"]);
  const { locale, t } = await getDictionary();
  const c = t.reports;

  const { period: raw } = await searchParams;
  const period: ReportPeriod = isReportPeriod(raw) ? raw : "this_month";
  const r = await getReportTotals(period);

  const renewalShare = r.revenue > 0 ? Math.round((r.renewalRevenue / r.revenue) * 100) : 0;
  const peakDay = [...r.series].sort((a, b) => b.revenue - a.revenue)[0];
  const conversion =
    r.leadsCreated > 0 ? Math.round((r.leadsConverted / r.leadsCreated) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.subtitle}</p>
        </div>
        <ReportPeriodSelect current={period} t={c} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={c.newClients} value={r.newClients} sublabel={c.bySignupDate} icon={Users2} tone="primary" />
        <StatTile label={c.revenue} value={formatSar(r.revenue)} sublabel={c.byPurchaseDate} icon={Banknote} tone="good" />
        <StatTile
          label={c.renewalRevenue}
          value={formatSar(r.renewalRevenue)}
          sublabel={`${renewalShare}% ${c.ofTotal}`}
          icon={Repeat}
          tone="neutral"
        />
        <StatTile
          label={c.packagesSold}
          value={r.packagesSold}
          sublabel={`${r.renewalsSold} ${c.renewalsOfThose}`}
          icon={Receipt}
          tone="primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={c.leadsCreated} value={r.leadsCreated} icon={Target} tone="neutral" />
        <StatTile
          label={c.leadsConverted}
          value={r.leadsConverted}
          sublabel={`${conversion}% ${c.conversionRate}`}
          icon={Target}
          tone={r.leadsConverted > 0 ? "good" : "neutral"}
        />
      </div>

      <TrendChart data={r.series} t={c} currency={c.currency} />

      <Card>
        <CardHeader>
          <CardTitle>{c.whereItCameFrom}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {r.revenue === 0 ? (
            <p className="text-sm text-muted-foreground">{c.nothingInPeriod}</p>
          ) : (
            <>
              {/* New vs renewal as one bar: the ratio is the point, not the pixels. */}
              <div className="flex flex-col gap-2">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-primary"
                    style={{ width: `${100 - renewalShare}%` }}
                    aria-hidden="true"
                  />
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${renewalShare}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
                    {c.fromNewCustomers} <span className="font-medium">{formatSar(r.newRevenue)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    {c.fromExistingCustomers}{" "}
                    <span className="font-medium">{formatSar(r.renewalRevenue)}</span>
                  </span>
                </div>
              </div>

              {peakDay && peakDay.revenue > 0 && (
                <p className="text-xs text-muted-foreground">
                  {c.bestDay} <bdi>{peakDay.date}</bdi> · {formatSar(peakDay.revenue)}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{c.byPackage}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {r.byPackage.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.nothingInPeriod}</p>
            ) : (
              r.byPackage.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <bdi>{p.name}</bdi>
                    <span className="text-muted-foreground"> · <bdi>{p.count}</bdi></span>
                  </span>
                  <span className="shrink-0 font-medium whitespace-nowrap">{formatSar(p.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{c.byPaymentMethod}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {r.byPaymentMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.nothingInPeriod}</p>
            ) : (
              r.byPaymentMethod.map((m) => (
                <div
                  key={m.method}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {m.method === "unknown" ? c.methodUnknown : label(m.method, locale)}
                    <span className="text-muted-foreground"> · <bdi>{m.count}</bdi></span>
                  </span>
                  <span className="shrink-0 font-medium whitespace-nowrap">{formatSar(m.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <BarChartCard
        title={c.leadsBySource}
        data={r.leadsBySource.map((s) => ({ name: label(s.source, locale), value: s.count }))}
        emptyMessage={c.nothingInPeriod}
      />
    </div>
  );
}
