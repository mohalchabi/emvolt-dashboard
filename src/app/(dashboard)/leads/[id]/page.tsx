import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { LeadDetailPanel } from "@/components/leads/lead-detail-panel";
import { LogContactForm } from "@/components/leads/log-contact-form";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { locale, t } = await getDictionary();

  const lead = await prisma.lead.findUnique({ where: { id }, include: { convertedClient: true } });
  if (!lead) notFound();

  const canManage = session.user.role === "admin";
  const isOwnLead = lead.assignedStaffId === session.user.id;
  if (!canManage && !isOwnLead) redirect("/");

  const [staff, logs, trainers] = await Promise.all([
    prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.activityLog.findMany({
      where: { leadId: id },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    lead.section
      ? prisma.staff.findMany({
          where: { active: true, role: "trainer", section: lead.section },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const backHref = canManage ? "/leads" : "/my-leads";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
          &larr; {canManage ? t.leadDetail.backToLeads : t.leadDetail.backToMyLeads}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{lead.name}</h1>
          {lead.section ? (
            <Badge variant="outline">{label(lead.section, locale)}</Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/60 text-amber-400">
              {t.common.needsReview}
            </Badge>
          )}
          <Badge variant="outline">{label(lead.interestedIn, locale)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {lead.phone} &middot; {t.leadDetail.via} {label(lead.source, locale)} &middot; {t.leadDetail.created}{" "}
          {lead.createdAt.toLocaleDateString()}
        </p>
        {lead.convertedClient && (
          <p className="mt-1 text-sm">
            <Link href={`/clients/${lead.convertedClient.id}`} className="text-primary hover:underline">
              {t.leadDetail.viewConvertedClient}
            </Link>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <LogContactForm leadId={lead.id} section={lead.section} trainers={trainers} t={t.logContactForm} locale={locale} />
        </div>
        <div className="flex flex-col gap-6">
          <LeadDetailPanel
            lead={lead}
            staff={staff}
            logs={logs}
            canManage={canManage}
            t={t.leadDetail}
            common={t.common}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
