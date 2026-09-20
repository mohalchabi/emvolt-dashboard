import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { MANAGER_ROLES } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { clientCompletions } from "@/lib/client-completion";
import { formatGymDate, formatGymTime } from "@/lib/time";
import { FinishedClientsPanel } from "@/components/clients/finished-clients-panel";
import { CloseOutPanel } from "@/components/clients/close-out-panel";

/**
 * The tidy-up screen: who has finished, and what is stopping us being sure.
 *
 * The two panels are deliberately in this order. Closing out the classes that
 * were never marked is what makes the finished list correct, so the evidence
 * comes before the decision that rests on it.
 */
export default async function ClientReviewPage() {
  await requireRole([...MANAGER_ROLES]);
  const { locale, t } = await getDictionary();
  const c = t.clientReview;
  const now = new Date();

  const [candidates, openSessions] = await Promise.all([
    // Already-churned clients have nothing to retire, so they're left out.
    prisma.client.findMany({
      where: { status: { not: "churned" } },
      select: { id: true, name: true, phone: true, assignedTrainer: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.session.findMany({
      where: { status: "scheduled", datetime: { lt: now } },
      select: {
        id: true,
        status: true,
        datetime: true,
        clientId: true,
        client: { select: { name: true } },
        lead: { select: { name: true } },
        trainer: { select: { name: true } },
      },
      orderBy: { datetime: "asc" },
      take: 100,
    }),
  ]);

  const completions = await clientCompletions(
    candidates.map((x) => x.id),
    now
  );

  const finishedIds = candidates.filter((x) => completions.get(x.id)?.finished).map((x) => x.id);

  // Only needed for the handful that qualify, so it's a second query rather
  // than dragging every client's sessions through the first one.
  const usage = finishedIds.length
    ? await prisma.session.groupBy({
        by: ["clientId"],
        where: { clientId: { in: finishedIds }, status: "completed" },
        _count: { _all: true },
        _max: { datetime: true },
      })
    : [];
  const usageByClient = new Map(
    usage.map((u) => [u.clientId as string, { count: u._count._all, last: u._max.datetime }])
  );

  const finished = candidates
    .filter((x) => completions.get(x.id)?.finished)
    .map((x) => {
      const used = usageByClient.get(x.id);
      return {
        id: x.id,
        name: x.name,
        phone: x.phone,
        trainerName: x.assignedTrainer?.name ?? null,
        totalSessions: used?.count ?? 0,
        lastSessionOn: used?.last ? formatGymDate(used.last, locale) : null,
      };
    });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {c.backToClients}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      <CloseOutPanel
        sessions={openSessions.map((s) => ({
          id: s.id,
          status: s.status,
          when: `${formatGymDate(s.datetime, locale)} · ${formatGymTime(s.datetime, locale)}`,
          clientId: s.clientId,
          clientName: s.client?.name ?? s.lead?.name ?? c.noClient,
          trainerName: s.trainer.name,
        }))}
        title={c.closeOutTitle}
        description={c.closeOutDesc}
        emptyText={c.closeOutEmpty}
        locale={locale}
        t={t.clientDetail}
      />

      <FinishedClientsPanel
        clients={finished}
        title={c.finishedTitle}
        emptyText={openSessions.length > 0 ? c.finishedEmptyWithOpen : c.finishedEmpty}
        t={c}
      />
    </div>
  );
}
