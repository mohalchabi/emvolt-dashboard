import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/db";
import { packageBalances } from "@/lib/package-balance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestRenewalButton } from "@/components/portal/request-renewal-button";

export default async function PortalPackagesPage() {
  const { client } = await requireClientSession();

  const packages = await prisma.package.findMany({
    where: { clientId: client.id },
    orderBy: { purchaseDate: "desc" },
  });
  const balances = await packageBalances(packages);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">My Packages</h1>
        <p className="text-sm text-muted-foreground">Your session packages and how many you have left.</p>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No packages yet — ask the studio to set one up for you.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {packages.map((pkg) => {
            const balance = balances.get(pkg.id) ?? { used: 0, remaining: pkg.totalSessions };
            const expired = pkg.expiryDate ? pkg.expiryDate < new Date() : false;
            return (
              <Card key={pkg.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  {expired ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : balance.remaining === 0 ? (
                    <Badge variant="secondary">Used up</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <span>
                    <strong className="text-foreground">{balance.remaining}</strong>{" "}
                    <span className="text-muted-foreground">of {pkg.totalSessions} sessions remaining</span>
                  </span>
                  <span className="text-muted-foreground">
                    Purchased {pkg.purchaseDate.toLocaleDateString()}
                    {pkg.expiryDate ? ` · expires ${pkg.expiryDate.toLocaleDateString()}` : ""}
                  </span>
                  {pkg.renewalRequestedAt ? (
                    <span className="text-primary">
                      Renewal requested {pkg.renewalRequestedAt.toLocaleDateString()} — the studio will follow up.
                    </span>
                  ) : (
                    <div className="mt-1">
                      <RequestRenewalButton packageId={pkg.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
