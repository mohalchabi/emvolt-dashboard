import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { packageBalances } from "@/lib/package-balance";
import { label } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewWalkInClientDialog } from "@/components/clients/new-walkin-client-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  paused: "secondary",
  churned: "destructive",
};

export default async function MyClientsPage() {
  const session = await requireRole(["trainer"]);

  const [clients, templates] = await Promise.all([
    prisma.client.findMany({
      where: { assignedTrainerId: session.user.id },
      include: { packages: true },
      orderBy: { name: "asc" },
    }),
    prisma.packageTemplate.findMany({ where: { active: true }, orderBy: [{ name: "asc" }, { sessions: "asc" }] }),
  ]);

  const allPackages = clients.flatMap((c) => c.packages);
  const balances = await packageBalances(allPackages);

  function remainingForClient(clientPackages: typeof allPackages) {
    const active = clientPackages.filter((p) => (balances.get(p.id)?.remaining ?? 0) > 0);
    if (active.length === 0) return null;
    return active.reduce((sum, p) => sum + (balances.get(p.id)?.remaining ?? 0), 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">My Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length === 1 ? "" : "s"} assigned to you.
          </p>
        </div>
        <NewWalkInClientDialog templates={templates} />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No clients assigned to you yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {clients.map((client) => {
              const remaining = remainingForClient(client.packages);
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex flex-col gap-1 rounded-lg border bg-card p-3 active:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{client.name}</span>
                    <Badge variant={STATUS_VARIANT[client.status]}>{label(client.status)}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{client.phone}</span>
                    {remaining === null ? (
                      <span>No active package</span>
                    ) : (
                      <span className={remaining <= 2 ? "font-medium text-destructive" : ""}>
                        {remaining} sessions left
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden sm:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sessions Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const remaining = remainingForClient(client.packages);
                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                            {client.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{client.phone}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[client.status]}>{label(client.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          {remaining === null ? (
                            <span className="text-muted-foreground">No active package</span>
                          ) : (
                            <span className={remaining <= 2 ? "font-medium text-destructive" : ""}>
                              {remaining}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
