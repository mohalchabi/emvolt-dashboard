import Link from "next/link";
import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/db";
import { packageBalances } from "@/lib/package-balance";
import { label } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PortalHomePage() {
  const { client } = await requireClientSession();

  const [nextSession, packages] = await Promise.all([
    prisma.session.findFirst({
      where: { clientId: client.id, status: "scheduled", datetime: { gte: new Date() } },
      orderBy: { datetime: "asc" },
      include: { trainer: true },
    }),
    prisma.package.findMany({ where: { clientId: client.id }, orderBy: { purchaseDate: "desc" } }),
  ]);

  const balances = await packageBalances(packages);
  const totalRemaining = packages.reduce((sum, p) => sum + (balances.get(p.id)?.remaining ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Welcome, {client.name}</h1>
        <p className="text-sm text-muted-foreground">Here's what's coming up.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next session</CardTitle>
          </CardHeader>
          <CardContent>
            {nextSession ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{label(nextSession.type)}</Badge>
                  <span className="font-medium">with {nextSession.trainer.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {nextSession.datetime.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}{" "}
                  at {nextSession.datetime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming sessions.{" "}
                <Link href="/portal/book" className="text-primary hover:underline">
                  Book one
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalRemaining}</div>
            <Link href="/portal/packages" className="text-sm text-primary hover:underline">
              View packages
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/portal/classes" className="text-sm text-primary hover:underline">
          My classes &rarr;
        </Link>
        <Link href="/portal/inbody" className="text-sm text-primary hover:underline">
          InBody results &rarr;
        </Link>
      </div>
    </div>
  );
}
