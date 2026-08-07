import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { packageBalances } from "@/lib/package-balance";
import { label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { HelpTip } from "@/components/help/help-tip";
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
  const { t } = await getDictionary();

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
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{t.myClientsPage.title}</h1>
            <HelpTip
              label={t.help.whatIsThis}
              title={t.help.myClients.title}
              body={t.help.myClients.body}
              steps={t.help.myClients.steps}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {clients.length}{" "}
            {clients.length === 1 ? t.myClientsPage.assignedSingular : t.myClientsPage.assignedPlural}
          </p>
        </div>
        <NewWalkInClientDialog templates={templates} dict={t.clientsPage} />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t.myClientsPage.noneYet}
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
                      <span>{t.clientsPage.noActivePackage}</span>
                    ) : (
                      <span className={remaining <= 2 ? "font-medium text-destructive" : ""}>
                        {remaining} {t.clientsPage.sessionsLeft}
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
                    <TableHead>{t.clientsPage.colName}</TableHead>
                    <TableHead>{t.clientsPage.colPhone}</TableHead>
                    <TableHead>{t.clientsPage.colStatus}</TableHead>
                    <TableHead>{t.clientsPage.colSessionsLeft}</TableHead>
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
                            <span className="text-muted-foreground">{t.clientsPage.noActivePackage}</span>
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
