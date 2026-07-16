"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label } from "@/lib/constants";
import { bulkAssignLeads } from "@/lib/actions/leads";
import type { Lead, Staff } from "@/generated/prisma/client";
import type { Dictionary, Locale } from "@/lib/i18n";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "outline",
  contacted: "secondary",
  trial_scheduled: "secondary",
  trial_completed: "secondary",
  converted: "default",
  lost: "destructive",
};

type LeadWithStaff = Lead & { assignedStaff: Staff | null };

export function LeadsList({
  leads,
  staff,
  t,
  locale,
  common,
}: {
  leads: LeadWithStaff[];
  staff: Staff[];
  t: Dictionary["leadsList"];
  locale: Locale;
  common: Dictionary["common"];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function onAssign() {
    if (!target || selected.size === 0) return;
    startTransition(async () => {
      try {
        const result = await bulkAssignLeads({ leadIds: Array.from(selected), staffId: target });
        const msg =
          locale === "ar"
            ? `تم تعيين ${result.count} ${result.count === 1 ? "عميل محتمل" : "عملاء محتملين"} إلى ${result.staffName}.`
            : `Assigned ${result.count} lead${result.count === 1 ? "" : "s"} to ${result.staffName}.`;
        toast.success(msg);
        setSelected(new Set());
        setTarget("");
        router.refresh();
      } catch {
        toast.error(t.couldNotAssign);
      }
    });
  }

  const selectedCount = selected.size;

  return (
    <div className="flex flex-col gap-3">
      {selectedCount > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-popover p-3 shadow-md">
          <span className="text-sm font-medium">{selectedCount} {t.selected}</span>
          <Select value={target} onValueChange={(v) => setTarget(v ?? "")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t.assignTo}>
                {(v: string) => staff.find((s) => s.id === v)?.name ?? t.assignTo}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({label(s.role, locale)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={onAssign} disabled={!target || isPending}>
            {isPending ? t.assigning : t.assign}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            {common.clear}
          </Button>
        </div>
      )}

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-2 sm:hidden">
        {leads.map((lead) => (
          <div key={lead.id} className="flex items-start gap-2 rounded-lg border bg-card p-3">
            <Checkbox
              checked={selected.has(lead.id)}
              onCheckedChange={() => toggle(lead.id)}
              className="mt-1"
              aria-label={`Select ${lead.name}`}
            />
            <Link href={`/leads/${lead.id}`} className="flex min-w-0 flex-1 flex-col gap-1 active:opacity-70">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{lead.name}</span>
                <Badge variant={STATUS_VARIANT[lead.status]}>{label(lead.status, locale)}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {lead.phone} · {label(lead.source, locale)}
                {!lead.section && <span className="text-amber-400"> · {common.needsReview}</span>}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{lead.assignedStaff?.name ?? common.unassigned}</span>
                <span>{lead.createdAt.toLocaleDateString()}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden sm:block">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>{t.colName}</TableHead>
                <TableHead>{t.colPhone}</TableHead>
                <TableHead>{t.colSource}</TableHead>
                <TableHead>{t.colSection}</TableHead>
                <TableHead>{t.colStatus}</TableHead>
                <TableHead>{t.colAssigned}</TableHead>
                <TableHead>{t.colCreated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} data-state={selected.has(lead.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggle(lead.id)}
                      aria-label={`Select ${lead.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                  <TableCell>{label(lead.source, locale)}</TableCell>
                  <TableCell>
                    {lead.section ? label(lead.section, locale) : <span className="text-amber-400">{common.needsReview}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[lead.status]}>{label(lead.status, locale)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.assignedStaff?.name ?? common.unassigned}
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
    </div>
  );
}
