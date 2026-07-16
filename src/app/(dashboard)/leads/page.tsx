import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { label, LEAD_STATUSES } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { guessGender } from "@/lib/gender-guess";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsList } from "@/components/leads/leads-list";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "outline",
  contacted: "secondary",
  trial_scheduled: "secondary",
  trial_completed: "secondary",
  converted: "default",
  lost: "destructive",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; section?: string; assigned?: string; gender?: string }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const { locale, t } = await getDictionary();

  const [rawLeads, staff] = await Promise.all([
    prisma.lead.findMany({
      where: {
        status: params.status || undefined,
        section: params.section || undefined,
        assignedStaffId:
          params.assigned === "assigned"
            ? { not: null }
            : params.assigned === "unassigned"
              ? null
              : undefined,
      },
      include: { assignedStaff: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const leads =
    params.gender && params.gender !== "all"
      ? rawLeads.filter((lead) => guessGender(lead.name) === params.gender)
      : rawLeads;

  const counts = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length])
  );
  const needsReviewCount = leads.filter((l) => !l.section).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t.leadsPage.title}</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} {leads.length === 1 ? t.leadsPage.matchingSingular : t.leadsPage.matchingPlural}
          </p>
        </div>
        <NewLeadDialog staff={staff} t={t.newLeadDialog} locale={locale} />
      </div>

      <div className="flex flex-wrap gap-2">
        {LEAD_STATUSES.map((s) => (
          <Badge key={s} variant={STATUS_VARIANT[s]} className="gap-1">
            {label(s, locale)}
            <span className="opacity-70">{counts[s] ?? 0}</span>
          </Badge>
        ))}
        {needsReviewCount > 0 && (
          <Badge variant="outline" className="gap-1 border-amber-500/60 text-amber-400">
            {t.common.needsReview}
            <span className="opacity-70">{needsReviewCount}</span>
          </Badge>
        )}
      </div>

      <LeadFilters
        currentStatus={params.status}
        currentSection={params.section}
        currentAssigned={params.assigned}
        currentGender={params.gender}
        t={t.leadFilters}
        locale={locale}
      />

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t.leadsPage.noLeadsMatch}
          </CardContent>
        </Card>
      ) : (
        <LeadsList leads={leads} staff={staff} t={t.leadsList} locale={locale} common={t.common} />
      )}
    </div>
  );
}
