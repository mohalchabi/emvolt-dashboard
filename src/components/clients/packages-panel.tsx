import { NewPackageDialog } from "@/components/clients/new-package-dialog";
import { DeletePackageButton } from "@/components/clients/delete-package-button";
import { packageBalances } from "@/lib/package-balance";
import { label } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Package } from "@/generated/prisma/client";
import type { Dictionary, Locale } from "@/lib/i18n";

export async function PackagesPanel({
  clientId,
  section,
  packages,
  locale,
  t,
  canDelete = false,
}: {
  clientId: string;
  section: string;
  packages: Package[];
  locale: Locale;
  t: Dictionary["clientDetail"];
  /** Removing a package rewrites revenue reporting, so it stays with the owner. */
  canDelete?: boolean;
}) {
  const [balances, templates, sessionCounts] = await Promise.all([
    packageBalances(packages),
    prisma.packageTemplate.findMany({
      where: { active: true, OR: [{ section: null }, { section }] },
      orderBy: [{ name: "asc" }, { sessions: "asc" }],
    }),
    // How many sessions each package carries, so the confirmation can say what
    // survives the delete rather than leaving it to be discovered afterwards.
    prisma.session.groupBy({
      by: ["packageId"],
      where: { packageId: { in: packages.map((p) => p.id) } },
      _count: { _all: true },
    }),
  ]);
  const sessionsByPackage = new Map(
    sessionCounts.map((row) => [row.packageId as string, row._count._all])
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.packages}</CardTitle>
        <NewPackageDialog
          clientId={clientId}
          templates={templates}
          dict={t}
          hasExistingPackages={packages.length > 0}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {packages.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.noPackages}</p>
        )}
        {packages.map((pkg) => {
          const balance = balances.get(pkg.id) ?? { used: 0, remaining: pkg.totalSessions };
          const pct = Math.min((balance.used / pkg.totalSessions) * 100, 100);
          return (
            <div key={pkg.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{pkg.name}</span>
                <div className="flex gap-1">
                  {pkg.isRenewal && <Badge variant="secondary">{t.renewalBadge}</Badge>}
                  {canDelete && (
                    <DeletePackageButton
                      packageId={pkg.id}
                      packageName={pkg.name}
                      sessionCount={sessionsByPackage.get(pkg.id) ?? 0}
                      t={t}
                    />
                  )}
                  {pkg.renewalRequestedAt && (
                    <Badge variant="outline" className="border-amber-500/60 text-amber-400">
                      {t.clientRequestedRenewal}
                    </Badge>
                  )}
                  {balance.remaining <= 2 && <Badge variant="destructive">{t.renewalAlert}</Badge>}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {balance.used} / {pkg.totalSessions} {t.sessionsUsed} ({balance.remaining} {t.remaining})
                </span>
                <span>{pkg.price.toLocaleString()} SAR</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {t.purchased} {pkg.purchaseDate.toLocaleDateString()}
                {pkg.expiryDate ? ` · ${t.expires} ${pkg.expiryDate.toLocaleDateString()}` : ""}
                {pkg.paymentMethod ? ` · ${t.paidVia} ${label(pkg.paymentMethod, locale)}` : ""}
              </div>
              {pkg.priceOverrideReason && (
                <div className="text-xs text-amber-400">{t.priceOverride} {pkg.priceOverrideReason}</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
