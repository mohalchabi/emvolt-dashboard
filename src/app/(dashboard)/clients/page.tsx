import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { packageBalances } from "@/lib/package-balance";
import { label, isManagerRole, CLIENT_STATUSES, MANAGER_ROLES } from "@/lib/constants";
import { countFinishedClients } from "@/lib/client-completion";
import { formatGymDate } from "@/lib/time";
import { getDictionary } from "@/lib/i18n";
import { HelpTip } from "@/components/help/help-tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientsList } from "@/components/clients/clients-list";

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
  const session = await requireRole([...MANAGER_ROLES, "front_desk"]);
  const canReview = isManagerRole(session.user.role);
  const params = await searchParams;
  const { locale, t } = await getDictionary();

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

  function hasRenewalRequest(clientPackages: typeof allPackages) {
    return clientPackages.some((p) => p.renewalRequestedAt);
  }

  const counts = Object.fromEntries(
    CLIENT_STATUSES.map((s) => [s, clients.filter((c) => c.status === s).length])
  );

  // Counted across every client, not just the ones passing the current
  // filters, so the badge doesn't change meaning as the filters move.
  const [finishedCount, openPastCount] = await Promise.all([
    countFinishedClients(),
    prisma.session.count({ where: { status: "scheduled", datetime: { lt: new Date() } } }),
  ]);
  const needsReview = finishedCount + openPastCount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{t.clientsPage.title}</h1>
            <HelpTip
              label={t.help.whatIsThis}
              title={t.help.addClient.title}
              body={t.help.addClient.body}
              steps={t.help.addClient.steps}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {clients.length}{" "}
            {clients.length === 1 ? t.clientsPage.matchingSingular : t.clientsPage.matchingPlural}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canReview && needsReview > 0 && (
            <Button variant="outline" render={<Link href="/clients/review" />}>
              {t.clientsPage.reviewFinished}
              <Badge variant="secondary" className="ms-1.5 tabular-nums">
                {needsReview}
              </Badge>
            </Button>
          )}
          <NewClientDialog trainers={trainers} t={t.clientsPage} />
        </div>
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

      <ClientsList
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          phone: client.phone,
          section: client.section,
          status: client.status,
          trainerName: client.assignedTrainer?.name ?? null,
          remaining: remainingForClient(client.packages),
          hasRenewalRequest: hasRenewalRequest(client.packages),
          since: formatGymDate(client.createdAt, locale),
        }))}
        canBulkEdit={canReview}
        t={t.clientsPage}
        emptyText={t.clientsPage.noneMatch}
      />
    </div>
  );
}
