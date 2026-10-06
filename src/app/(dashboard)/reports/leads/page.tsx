import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-helpers";
import { MANAGER_ROLES, label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { getLeadActivity } from "@/lib/lead-activity";
import { isReportPeriod, type ReportPeriod } from "@/lib/report-periods";
import { formatGymDate } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportPeriodSelect } from "@/components/reports/period-select";

/**
 * Whether the leads being handed out are actually being worked.
 *
 * Ordered by how little has been done rather than alphabetically, because the
 * reason to open this page is to find out who needs a word, and that person
 * should not be somewhere in the middle of the list.
 */
export default async function LeadActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireRole([...MANAGER_ROLES]);
  const { locale, t } = await getDictionary();
  const c = t.leadActivity;

  const params = await searchParams;
  const period: ReportPeriod = isReportPeriod(params.period) ? params.period : "this_week";
  const rows = await getLeadActivity(period);

  const ranked = [...rows].sort((a, b) => a.leadsReached - b.leadsReached);
  const totalReached = rows.reduce((sum, r) => sum + r.leadsReached, 0);
  const totalAttempts = rows.reduce((sum, r) => sum + r.attempts, 0);
  const silent = rows.filter((r) => r.assigned > 0 && r.leadsReached === 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {c.backToReports}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      <ReportPeriodSelect current={period} t={t.reports} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Summary label={c.leadsReached} value={totalReached} />
        <Summary label={c.attempts} value={totalAttempts} />
        <Summary
          label={c.noneAtAll}
          value={silent}
          tone={silent > 0 ? "bad" : "good"}
          sublabel={c.noneAtAllHint}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{c.byPerson}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {ranked.map((row) => (
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
                  {row.assigned > 0 && row.leadsReached === 0 && (
                    <Badge variant="destructive">{c.calledNobody}</Badge>
                  )}
                  {row.neverContacted > 0 && (
                    <Badge variant="outline" className="border-amber-500/60 text-amber-400">
                      {c.untouched.replace("{count}", String(row.neverContacted))}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {c.assigned}{" "}
                  <bdi className="font-medium text-foreground tabular-nums">{row.assigned}</bdi>
                </span>
                <span>
                  {c.reached}{" "}
                  <bdi className="font-medium text-foreground tabular-nums">{row.leadsReached}</bdi>
                </span>
                <span>
                  {c.attempts}{" "}
                  <bdi className="font-medium text-foreground tabular-nums">{row.attempts}</bdi>
                </span>
                <span>
                  {c.daysActive}{" "}
                  <bdi className="font-medium text-foreground tabular-nums">{row.activeDays}</bdi>
                </span>
                {row.lastContactAt && (
                  <span>
                    {c.lastCall} <bdi>{formatGymDate(row.lastContactAt, locale)}</bdi>
                  </span>
                )}
              </div>

              {Object.keys(row.outcomes).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(row.outcomes).map(([outcome, count]) => (
                    <Badge key={outcome} variant="secondary" className="gap-1">
                      {label(outcome, locale)}
                      <span className="tabular-nums opacity-70">{count}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({
  label: l,
  value,
  sublabel,
  tone = "neutral",
}: {
  label: string;
  value: number;
  sublabel?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const colour =
    tone === "bad" ? "text-destructive" : tone === "good" ? "text-emerald-400" : "text-foreground";
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className={`text-2xl font-semibold tabular-nums ${colour}`}>{value}</span>
      <span className="text-sm font-medium">{l}</span>
      {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
    </div>
  );
}
