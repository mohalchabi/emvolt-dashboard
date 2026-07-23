import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getRecentActivity } from "@/lib/kpi";
import type { Dictionary } from "@/lib/i18n";

export function RecentActivityCard({
  activity,
  t,
}: {
  activity: Awaited<ReturnType<typeof getRecentActivity>>;
  t: Dictionary["recentActivity"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {activity.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.noActivityYet}</p>
        ) : (
          activity.map((entry) => {
            const row = (
              <div className="flex flex-col gap-0.5 rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{entry.authorName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.createdAt.toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {entry.target && <span className="text-foreground">{entry.target.name}: </span>}
                  {entry.text}
                </p>
              </div>
            );
            return entry.target ? (
              <Link
                key={entry.id}
                href={entry.target.type === "lead" ? `/leads/${entry.target.id}` : `/clients/${entry.target.id}`}
                className="hover:bg-accent"
              >
                {row}
              </Link>
            ) : (
              <div key={entry.id}>{row}</div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
