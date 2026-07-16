import Link from "next/link";
import { differenceInDays } from "date-fns";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { getFirstContactStats } from "@/lib/kpi";
import type { Dictionary } from "@/lib/i18n";

export function StaleLeadsCard({
  stats,
  t,
}: {
  stats: Awaited<ReturnType<typeof getFirstContactStats>>;
  t: Dictionary["staleLeads"];
}) {
  const now = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {t.avgTimeToFirstContact}{" "}
          <strong className="text-foreground">
            {stats.avgHours === null ? "—" : formatHours(stats.avgHours)}
          </strong>
        </p>

        {stats.staleNewLeads.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.noNewLeadsWaiting}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {stats.staleNewLeads.map((lead) => {
              const days = differenceInDays(now, lead.createdAt);
              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{lead.name}</span>
                  </div>
                  <Badge variant={days >= 2 ? "destructive" : "outline"} className="shrink-0">
                    {days === 0 ? t.today : `${days}d`}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}
