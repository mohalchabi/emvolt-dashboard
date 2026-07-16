"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  LEAD_STATUSES,
  LOST_REASONS,
  SECTIONS,
  label,
} from "@/lib/constants";
import {
  updateLeadStatus,
  assignLead,
  updateLeadSection,
  addLeadNote,
  convertLeadToClient,
} from "@/lib/actions/leads";
import type { Staff, ActivityLog, Lead } from "@/generated/prisma/client";
import type { Dictionary, Locale } from "@/lib/i18n";

type Props = {
  lead: Lead;
  staff: Staff[];
  logs: (ActivityLog & { author: Staff })[];
  canManage: boolean;
  t: Dictionary["leadDetail"];
  common: Dictionary["common"];
  locale: Locale;
};

export function LeadDetailPanel({ lead, staff, logs, canManage, t, common, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const currentLostReason = lead.lostReason ?? "other";

  function onStatusChange(status: string) {
    startTransition(async () => {
      try {
        await updateLeadStatus({
          leadId: lead.id,
          status,
          lostReason: status === "lost" ? currentLostReason : null,
        });
        router.refresh();
      } catch {
        toast.error(t.couldNotUpdateStatus);
      }
    });
  }

  function onLostReasonChange(reason: string) {
    startTransition(async () => {
      try {
        await updateLeadStatus({ leadId: lead.id, status: "lost", lostReason: reason });
        router.refresh();
      } catch {
        toast.error(t.couldNotUpdateLostReason);
      }
    });
  }

  function onSectionChange(section: string) {
    startTransition(async () => {
      try {
        await updateLeadSection({ leadId: lead.id, section });
        router.refresh();
      } catch {
        toast.error(t.couldNotUpdateSection);
      }
    });
  }

  function onAssignChange(staffId: string) {
    startTransition(async () => {
      try {
        await assignLead({ leadId: lead.id, assignedStaffId: staffId === "none" ? null : staffId });
        router.refresh();
      } catch {
        toast.error(t.couldNotReassign);
      }
    });
  }

  function onConvert() {
    startTransition(async () => {
      try {
        const client = await convertLeadToClient(lead.id);
        router.push(`/clients/${client.id}`);
      } catch {
        toast.error(t.couldNotConvert);
      }
    });
  }

  function onAddNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      try {
        await addLeadNote({ leadId: lead.id, text: note.trim() });
        setNote("");
        router.refresh();
      } catch {
        toast.error(t.couldNotAddNote);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.statusTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t.section}</Label>
              <Select
                value={lead.section ?? "unset"}
                onValueChange={(v) => v && v !== "unset" && onSectionChange(v)}
                disabled={isPending}
              >
                <SelectTrigger className={`w-full ${!lead.section ? "border-amber-500/60 text-amber-400" : ""}`}>
                  <SelectValue>
                    {(v: string) => (v === "unset" ? common.needsReview : label(v, locale))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {!lead.section && (
                    <SelectItem value="unset" disabled>
                      {common.needsReview}
                    </SelectItem>
                  )}
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t.status}</Label>
              <Select value={lead.status} onValueChange={(v) => v && onStatusChange(v)} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => label(v, locale)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t.assignedTo}</Label>
              {canManage ? (
                <Select
                  value={lead.assignedStaffId ?? "none"}
                  onValueChange={(v) => v && onAssignChange(v)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) => (v === "none" ? common.unassigned : staff.find((s) => s.id === v)?.name ?? v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{common.unassigned}</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-9 items-center rounded-lg border px-3 text-sm text-muted-foreground">
                  {staff.find((s) => s.id === lead.assignedStaffId)?.name ?? common.unassigned}
                </div>
              )}
            </div>
          </div>

          {lead.status === "lost" && (
            <div className="flex flex-col gap-1.5">
              <Label>{t.lostReason}</Label>
              <Select value={currentLostReason} onValueChange={(v) => v && onLostReasonChange(v)} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => label(v, locale)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {label(r, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {lead.status !== "converted" && lead.status !== "lost" && (
            <div className="flex flex-col gap-1.5">
              <Button onClick={onConvert} disabled={isPending || !lead.section} className="w-fit">
                {t.convertToClient}
              </Button>
              {!lead.section && (
                <p className="text-xs text-amber-400">{t.setSectionBeforeConverting}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.activityTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Textarea
              placeholder={t.addNotePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-16"
            />
            <Button onClick={onAddNote} disabled={isPending || !note.trim()} className="self-end">
              {t.add}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {logs.map((log) => (
              <div key={log.id} className="border-l-2 border-border pl-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">{log.author.name}</span>
                  <span>{log.createdAt.toLocaleString()}</span>
                </div>
                <p>{log.text}</p>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.noActivityYet}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
