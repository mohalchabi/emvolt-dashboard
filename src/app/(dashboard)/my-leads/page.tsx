import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { label, LEAD_STATUSES, DAILY_LEAD_TARGET } from "@/lib/constants";
import { startOfGymDay, endOfGymDay } from "@/lib/time";
import { QuickLogButtons, DailyLeadNudge } from "@/components/leads/quick-log";
import { getDictionary } from "@/lib/i18n";
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
import { HelpTip } from "@/components/help/help-tip";

// A lead already converted or written off has nothing left to quick-log.
const OPEN_FOR_QUICK_LOG = ["new", "contacted", "trial_completed"];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "outline",
  contacted: "secondary",
  trial_scheduled: "secondary",
  trial_completed: "secondary",
  converted: "default",
  lost: "destructive",
};

export default async function MyLeadsPage() {
  const session = await requireRole(["front_desk", "trainer"]);
  const { locale, t } = await getDictionary();

  const leads = await prisma.lead.findMany({
    where: { assignedStaffId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const reachedToday = await prisma.leadContactAttempt
    .findMany({
      where: {
        staffId: session.user.id,
        createdAt: { gte: startOfGymDay(), lte: endOfGymDay() },
      },
      select: { leadId: true },
    })
    // Distinct people, matching how the target is counted everywhere else.
    .then((rows) => new Set(rows.map((r) => r.leadId)).size);

  const counts = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length])
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t.myLeadsPage.title}</h1>
          <HelpTip
            label={t.help.whatIsThis}
            title={t.help.myLeads.title}
            body={t.help.myLeads.body}
            steps={t.help.myLeads.steps}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {leads.length} {leads.length === 1 ? t.myLeadsPage.assignedSingular : t.myLeadsPage.assignedPlural}{" "}
          {t.myLeadsPage.updateHint}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {LEAD_STATUSES.map((s) => (
          <Badge key={s} variant={STATUS_VARIANT[s]} className="gap-1">
            {label(s, locale)}
            <span className="opacity-70">{counts[s] ?? 0}</span>
          </Badge>
        ))}
        <HelpTip
          label={t.help.whatIsThis}
          title={t.help.leadStatus.title}
          body={t.help.leadStatus.body}
          steps={t.help.leadStatus.steps}
        />
      </div>

      <DailyLeadNudge
        reachedToday={reachedToday}
        target={DAILY_LEAD_TARGET}
        t={t.myLeadsPage}
      />

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t.myLeadsPage.noLeadsYet}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {leads.map((lead) => (
              <div key={lead.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                <Link href={`/leads/${lead.id}`} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      <bdi>{lead.name}</bdi>
                    </span>
                    <Badge variant={STATUS_VARIANT[lead.status]}>{label(lead.status, locale)}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <bdi>{lead.phone}</bdi> · {label(lead.source, locale)}
                    {!lead.section && <span className="text-amber-400"> · {t.common.needsReview}</span>}
                  </div>
                </Link>
                {OPEN_FOR_QUICK_LOG.includes(lead.status) && (
                  <QuickLogButtons leadId={lead.id} method="whatsapp" t={t.myLeadsPage} />
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden sm:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.myLeadsPage.colName}</TableHead>
                    <TableHead>{t.myLeadsPage.colPhone}</TableHead>
                    <TableHead>{t.myLeadsPage.colSource}</TableHead>
                    <TableHead>{t.myLeadsPage.colSection}</TableHead>
                    <TableHead>{t.myLeadsPage.colStatus}</TableHead>
                    <TableHead>{t.myLeadsPage.colCreated}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                          {lead.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                      <TableCell>{label(lead.source, locale)}</TableCell>
                      <TableCell>
                        {lead.section ? (
                          label(lead.section, locale)
                        ) : (
                          <span className="text-amber-400">{t.common.needsReview}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[lead.status]}>{label(lead.status, locale)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.createdAt.toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
