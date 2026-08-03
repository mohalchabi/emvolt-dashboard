import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { label } from "@/lib/constants";
import { packageBalances } from "@/lib/package-balance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientDetailPanel } from "@/components/clients/client-detail-panel";
import { PackagesPanel } from "@/components/clients/packages-panel";
import { InbodyPanel } from "@/components/clients/inbody-panel";
import { MessagesPanel } from "@/components/clients/messages-panel";
import { BookSessionDialog } from "@/components/clients/book-session-dialog";
import { PreviewAsClientButton } from "@/components/clients/preview-as-client-button";

const SESSION_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "outline",
  completed: "default",
  cancelled: "secondary",
  no_show: "destructive",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { convertedFromLead: true, packages: { orderBy: { purchaseDate: "desc" } } },
  });
  if (!client) notFound();

  const canManage = session.user.role === "admin" || session.user.role === "front_desk";
  const isOwnTrainer = session.user.role === "trainer" && client.assignedTrainerId === session.user.id;
  if (!canManage && !isOwnTrainer) redirect("/");

  const [trainers, logs, sessions, inBodyResults, messages] = await Promise.all([
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
  ]);

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
          &larr; Back to {canManage ? "Clients" : "My Clients"}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{client.name}</h1>
          <Badge variant="outline">{label(client.section)}</Badge>
          {session.user.role === "admin" && <PreviewAsClientButton clientId={client.id} />}
        </div>
        <p className="text-sm text-muted-foreground">
          {client.phone}
          {client.email ? ` · ${client.email}` : ""} · client since {client.createdAt.toLocaleDateString()}
          {client.source ? ` · via ${label(client.source)}` : ""}
        </p>
        {client.convertedFromLead && (
          <p className="mt-1 text-sm">
            <Link href={`/leads/${client.convertedFromLead.id}`} className="text-primary hover:underline">
              View original lead &rarr;
            </Link>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ClientDetailPanel client={client} trainers={trainers} logs={logs} canManage={canManage} />
        </div>

        <div className="flex flex-col gap-6">
          <PackagesPanel clientId={client.id} section={client.section} packages={client.packages} />
          <InbodyPanel clientId={client.id} results={inBodyResults} />
          <MessagesPanel clientId={client.id} clientName={client.name} messages={messages} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Sessions</CardTitle>
              <BookSessionDialog clientId={client.id} packages={eligiblePackages} />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{label(s.type)}</span>{" "}
                    <span className="text-muted-foreground">
                      {s.datetime.toLocaleDateString()} {s.datetime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <Badge variant={SESSION_STATUS_VARIANT[s.status]}>{label(s.status)}</Badge>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
