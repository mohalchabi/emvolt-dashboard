import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { getUpcomingTrials } from "@/lib/kpi";
import type { Dictionary } from "@/lib/i18n";

export function UpcomingTrialsCard({
  data,
  t,
  common,
}: {
  data: Awaited<ReturnType<typeof getUpcomingTrials>>;
  t: Dictionary["upcomingTrials"];
  common: Dictionary["common"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{data.todayCount}</strong> {common.today}
          </span>
          <span>
            <strong className="text-foreground">{data.weekCount}</strong> {common.thisWeek}
          </span>
        </div>

        {data.trials.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.noTrialsScheduled}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.trials.slice(0, 6).map((trial) => (
              <Link
                key={trial.id}
                href={`/leads/${trial.leadId}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <div className="flex items-center gap-2 truncate">
                  <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{trial.lead?.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {trial.trainer.name}
                  </Badge>
                  <span>
                    {trial.datetime.toLocaleDateString([], { weekday: "short" })}{" "}
                    {trial.datetime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
