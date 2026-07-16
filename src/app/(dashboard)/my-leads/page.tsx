import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { label, LEAD_STATUSES } from "@/lib/constants";
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

  const counts = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length])
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t.myLeadsPage.title}</h1>
        <p className="text-sm text-muted-foreground">
          {leads.length} {leads.length === 1 ? t.myLeadsPage.assignedSingular : t.myLeadsPage.assignedPlural}{" "}
          {t.myLeadsPage.updateHint}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEAD_STATUSES.map((s) => (
          <Badge key={s} variant={STATUS_VARIANT[s]} className="gap-1">
            {label(s, locale)}
            <span className="opacity-70">{counts[s] ?? 0}</span>
          </Badge>
        ))}
      </div>

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
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex flex-col gap-1 rounded-lg border bg-card p-3 active:bg-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{lead.name}</span>
                  <Badge variant={STATUS_VARIANT[lead.status]}>{label(lead.status, locale)}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {lead.phone} · {label(lead.source, locale)}
                  {!lead.section && <span className="text-amber-400"> · {t.common.needsReview}</span>}
                </div>
              </Link>
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
