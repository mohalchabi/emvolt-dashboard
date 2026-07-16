import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { getRenewalAlerts } from "@/lib/kpi";
import type { Dictionary } from "@/lib/i18n";

export function RenewalAlertsCard({
  alerts,
  t,
}: {
  alerts: Awaited<ReturnType<typeof getRenewalAlerts>>;
  t: Dictionary["renewalAlerts"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {alerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.noClientsLow}</p>
        ) : (
          alerts.slice(0, 8).map(({ pkg, balance }) => (
            <Link
              key={pkg.id}
              href={`/clients/${pkg.clientId}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              <div className="flex items-center gap-2 truncate">
                <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                <span className="truncate font-medium">{pkg.client.name}</span>
                <span className="truncate text-muted-foreground">{pkg.name}</span>
              </div>
              <Badge variant={balance.remaining === 0 ? "destructive" : "secondary"} className="shrink-0">
                {balance.remaining} {t.left}
              </Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
