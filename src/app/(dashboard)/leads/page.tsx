import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { label, LEAD_STATUSES } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { guessGender } from "@/lib/gender-guess";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsList } from "@/components/leads/leads-list";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "outline",
  contacted: "secondary",
  trial_scheduled: "secondary",
  trial_completed: "secondary",
  converted: "default",
  lost: "destructive",
};

const PAGE_SIZE = 50;
// `gender` is a JS-side heuristic filter (no DB column backs it), so it can't
// be pushed down to the database like the other filters. When it's active we
// fall back to scanning a bounded window instead of the whole table.
const GENDER_FILTER_SCAN_CAP = 2000;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; section?: string; assigned?: string; gender?: string; page?: string }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const { locale, t } = await getDictionary();

  const page = Math.max(1, Number(params.page) || 1);
  const genderActive = Boolean(params.gender && params.gender !== "all");

  const where = {
    status: params.status || undefined,
    section: params.section || undefined,
    assignedStaffId:
      params.assigned === "assigned"
        ? { not: null }
        : params.assigned === "unassigned"
          ? null
          : undefined,
  };

  const [leadsRaw, totalCountNoGender, staff, statusBreakdown, needsReviewCount] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { assignedStaff: true },
      orderBy: { createdAt: "desc" },
      take: genderActive ? GENDER_FILTER_SCAN_CAP : PAGE_SIZE,
      skip: genderActive ? 0 : (page - 1) * PAGE_SIZE,
    }),
    prisma.lead.count({ where }),
    prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    // Status tab counts ignore the status filter itself (so all tabs stay visible)
    // but still respect section/assigned, matching what "Leads" here means.
    prisma.lead.groupBy({
      by: ["status"],
      where: { section: params.section || undefined, assignedStaffId: where.assignedStaffId },
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: { status: params.status || undefined, assignedStaffId: where.assignedStaffId, section: null },
    }),
  ]);

  const genderFiltered = genderActive
    ? leadsRaw.filter((lead) => guessGender(lead.name) === params.gender)
    : leadsRaw;

  const totalCount = genderActive ? genderFiltered.length : totalCountNoGender;
  const leads = genderActive ? genderFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : genderFiltered;

  const counts = Object.fromEntries(statusBreakdown.map((row) => [row.status, row._count._all]));
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(target: number) {
    const p = new URLSearchParams();
    if (params.status) p.set("status", params.status);
    if (params.section) p.set("section", params.section);
    if (params.assigned) p.set("assigned", params.assigned);
    if (params.gender) p.set("gender", params.gender);
    if (target > 1) p.set("page", String(target));
    const qs = p.toString();
    return qs ? `/leads?${qs}` : "/leads";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t.leadsPage.title}</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? t.leadsPage.matchingSingular : t.leadsPage.matchingPlural}
            {genderActive && totalCount >= GENDER_FILTER_SCAN_CAP ? ` (${t.leadsPage.genderScanCapNote})` : ""}
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
        <>
          <LeadsList
            leads={leads}
            staff={staff}
            t={t.leadsList}
            campaignT={t.sendCampaignDialog}
            locale={locale}
            common={t.common}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {t.leadsPage.pageOf} {page} {t.leadsPage.of} {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    {t.leadsPage.previous}
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    {t.leadsPage.previous}
                  </Button>
                )}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    {t.leadsPage.next}
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    {t.leadsPage.next}
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
