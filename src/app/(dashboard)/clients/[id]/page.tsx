import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { getDictionary } from "@/lib/i18n";
import { label, isManagerRole } from "@/lib/constants";
import { packageBalances } from "@/lib/package-balance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientDetailPanel } from "@/components/clients/client-detail-panel";
import { PackagesPanel } from "@/components/clients/packages-panel";
import { MergeClientDialog } from "@/components/clients/merge-client-dialog";
import { InbodyPanel } from "@/components/clients/inbody-panel";
import { MessagesPanel } from "@/components/clients/messages-panel";
import { BookSessionDialog } from "@/components/clients/book-session-dialog";
import { SessionStatusMenu } from "@/components/calendar/session-status-menu";
import { PreviewAsClientButton } from "@/components/clients/preview-as-client-button";
import { DocumentsPanel } from "@/components/clients/documents-panel";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { locale, t } = await getDictionary();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { convertedFromLead: true, packages: { orderBy: { purchaseDate: "desc" } } },
  });
  if (!client) notFound();

  const canManage = isManagerRole(session.user.role) || session.user.role === "front_desk";
  const isOwnTrainer = session.user.role === "trainer" && client.assignedTrainerId === session.user.id;
  if (!canManage && !isOwnTrainer) redirect("/");

  const [trainers, logs, sessions, inBodyResults, messages, documents] = await Promise.all([
    prisma.staff.findMany({ where: { active: true, role: "trainer" }, orderBy: { name: "asc" } }),
    prisma.activityLog.findMany({
      where: { clientId: id },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.session.findMany({
      where: { clientId: id },
      orderBy: { datetime: "desc" },
      take: 10,
    }),
    prisma.inBodyResult.findMany({
      where: { clientId: id },
      include: { uploadedBy: true },
      orderBy: { takenAt: "desc" },
    }),
    prisma.message.findMany({
      where: { clientId: id },
      include: { authorStaff: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.clientDocument.findMany({
      where: { clientId: id },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Duplicates are the whole reason merging exists, so same-phone matches sort
  // to the top; the rest of the list is there for a duplicate typed in with a
  // mistyped number. Admin-only, and only loaded for them.
  const mergeCandidates =
    isManagerRole(session.user.role)
      ? (
          await prisma.client.findMany({
            where: { id: { not: client.id } },
            select: { id: true, name: true, phone: true },
            orderBy: { name: "asc" },
            take: 300,
          })
        )
          .map((c) => ({ ...c, samePhone: c.phone === client.phone }))
          .sort((a, b) => Number(b.samePhone) - Number(a.samePhone))
      : [];

  const backHref = canManage ? "/clients" : "/my-clients";

  const activePackages = client.packages.filter((p) => !p.expiryDate || p.expiryDate > new Date());
  const balances = await packageBalances(activePackages);
  const eligiblePackages = activePackages
    .map((p) => ({ id: p.id, name: p.name, remaining: balances.get(p.id)?.remaining ?? 0 }))
    .filter((p) => p.remaining > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
          &larr; {canManage ? t.clientDetail.backToClients : t.myClientsPage.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{client.name}</h1>
          <Badge variant="outline">{label(client.section, locale)}</Badge>
          {session.user.role === "admin" && <PreviewAsClientButton clientId={client.id} />}
          {isManagerRole(session.user.role) && (
            <MergeClientDialog
              clientId={client.id}
              clientName={client.name}
              candidates={mergeCandidates}
              t={t.clientDetail}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {client.phone}
          {client.email ? ` · ${client.email}` : ""} · {t.clientDetail.clientSince} {client.createdAt.toLocaleDateString()}
          {client.source ? ` · ${label(client.source, locale)}` : ""}
          {client.idNumber ? ` · ID ${client.idNumber}` : ""}
        </p>
        {client.convertedFromLead && (
          <p className="mt-1 text-sm">
            <Link href={`/leads/${client.convertedFromLead.id}`} className="text-primary hover:underline">
              {t.clientDetail.viewOriginalLead} &rarr;
            </Link>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ClientDetailPanel client={client} trainers={trainers} logs={logs} canManage={canManage} dict={t.clientDetail} locale={locale} />
        </div>

        <div className="flex flex-col gap-6">
          <PackagesPanel clientId={client.id} section={client.section} packages={client.packages} locale={locale} t={t.clientDetail} canDelete={session.user.role === "admin"} />
          <InbodyPanel clientId={client.id} results={inBodyResults} t={t.clientDetail} />
          <DocumentsPanel
            clientId={client.id}
            contracts={documents.filter((d) => d.type === "contract")}
            idDocuments={documents.filter((d) => d.type === "id_document")}
            t={t.clientDetail}
          />
          <MessagesPanel clientId={client.id} clientName={client.name} messages={messages} t={t.clientDetail} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t.clientDetail.recentSessions}</CardTitle>
              <BookSessionDialog clientId={client.id} packages={eligiblePackages} locale={locale} t={t.clientDetail} />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{label(s.type, locale)}</span>{" "}
                    <span className="text-muted-foreground">
                      {s.datetime.toLocaleDateString()} {s.datetime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <SessionStatusMenu sessionId={s.id} status={s.status} locale={locale} t={t.clientDetail} />
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.clientDetail.noSessions}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
