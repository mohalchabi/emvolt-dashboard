import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { packageBalances } from "@/lib/package-balance";
import { label, CLIENT_STATUSES } from "@/lib/constants";
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
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { ClientFilters } from "@/components/clients/client-filters";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  paused: "secondary",
  churned: "destructive",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; section?: string; trainer?: string }>;
}) {
  await requireRole(["admin", "front_desk"]);
  const params = await searchParams;

  const [clients, trainers] = await Promise.all([
    prisma.client.findMany({
      where: {
        status: params.status || undefined,
        section: params.section || undefined,
        assignedTrainerId: params.trainer || undefined,
      },
      include: { assignedTrainer: true, packages: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.staff.findMany({
      where: { active: true, role: "trainer" },
      orderBy: { name: "asc" },
    }),
  ]);

  const allPackages = clients.flatMap((c) => c.packages);
  const balances = await packageBalances(allPackages);

  function remainingForClient(clientPackages: typeof allPackages) {
    const active = clientPackages.filter((p) => (balances.get(p.id)?.remaining ?? 0) > 0);
    if (active.length === 0) return null;
    return active.reduce((sum, p) => sum + (balances.get(p.id)?.remaining ?? 0), 0);
  }

  const counts = Object.fromEntries(
    CLIENT_STATUSES.map((s) => [s, clients.filter((c) => c.status === s).length])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length === 1 ? "" : "s"} matching current filters.
          </p>
        </div>
        <NewClientDialog trainers={trainers} />
      </div>

      <div className="flex flex-wrap gap-2">
        {CLIENT_STATUSES.map((s) => (
          <Badge key={s} variant={STATUS_VARIANT[s]} className="gap-1">
            {label(s)}
            <span className="opacity-70">{counts[s] ?? 0}</span>
          </Badge>
        ))}
      </div>

      <ClientFilters
        currentStatus={params.status}
        currentSection={params.section}
        currentTrainer={params.trainer}
        trainers={trainers}
      />

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No clients match these filters.
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
                  <div className="text-sm text-muted-foreground">
                    {client.phone} · {label(client.section)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{client.assignedTrainer?.name ?? "Unassigned"}</span>
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
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Sessions Left</TableHead>
                    <TableHead>Client Since</TableHead>
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
                        <TableCell>{label(client.section)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[client.status]}>{label(client.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.assignedTrainer?.name ?? "Unassigned"}
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
                        <TableCell className="text-muted-foreground">
                          {client.createdAt.toLocaleDateString()}
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
