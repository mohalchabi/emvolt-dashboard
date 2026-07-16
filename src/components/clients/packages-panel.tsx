import { NewPackageDialog } from "@/components/clients/new-package-dialog";
import { packageBalances } from "@/lib/package-balance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Package } from "@/generated/prisma/client";

export async function PackagesPanel({
  clientId,
  packages,
}: {
  clientId: string;
  packages: Package[];
}) {
  const balances = await packageBalances(packages);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Packages</CardTitle>
        <NewPackageDialog clientId={clientId} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {packages.length === 0 && (
          <p className="text-sm text-muted-foreground">No packages purchased yet.</p>
        )}
        {packages.map((pkg) => {
          const balance = balances.get(pkg.id) ?? { used: 0, remaining: pkg.totalSessions };
          const pct = Math.min((balance.used / pkg.totalSessions) * 100, 100);
          return (
            <div key={pkg.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{pkg.name}</span>
                {balance.remaining <= 2 && (
                  <Badge variant="destructive">Renewal alert</Badge>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {balance.used} / {pkg.totalSessions} sessions used ({balance.remaining} remaining)
                </span>
                <span>{pkg.price.toLocaleString()} SAR</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Purchased {pkg.purchaseDate.toLocaleDateString()}
                {pkg.expiryDate ? ` · Expires ${pkg.expiryDate.toLocaleDateString()}` : ""}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
