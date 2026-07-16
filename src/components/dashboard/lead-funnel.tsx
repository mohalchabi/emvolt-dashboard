import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { label } from "@/lib/constants";
import type { getLeadFunnel } from "@/lib/kpi";
import type { Dictionary, Locale } from "@/lib/i18n";

// Ordinal encoding: one hue, monotone opacity steps — position in the funnel
// is what the color communicates, not identity between stages.
const OPACITY_STEPS = [1, 0.84, 0.68, 0.52, 0.36];

export async function LeadFunnelCard({
  funnel,
  t,
  locale,
}: {
  funnel: Awaited<ReturnType<typeof getLeadFunnel>>;
  t: Dictionary["leadFunnel"];
  locale: Locale;
}) {
  const max = Math.max(...funnel.stages.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {funnel.stages.map((stage, i) => (
          <div key={stage.status} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-muted-foreground">{label(stage.status, locale)}</span>
            <div className="h-6 flex-1 rounded-md bg-muted">
              <div
                className="h-full rounded-md"
                style={{
                  width: `${(stage.count / max) * 100}%`,
                  backgroundColor: "var(--chart-1)",
                  opacity: OPACITY_STEPS[i] ?? 0.3,
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">{stage.count}</span>
          </div>
        ))}

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">{funnel.total} {t.totalLeads}</span>
          <span>
            <strong className="text-foreground">{funnel.converted}</strong>{" "}
            <span className="text-muted-foreground">
              {t.converted} ({(funnel.conversionRate * 100).toFixed(0)}%)
            </span>
          </span>
          <span>
            <strong className="text-foreground">{funnel.lost}</strong>{" "}
            <span className="text-muted-foreground">{t.lost} ({(funnel.lostRate * 100).toFixed(0)}%)</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
