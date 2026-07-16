"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CONTACT_METHODS, CONTACT_OUTCOMES, LOST_REASONS, label } from "@/lib/constants";
import { logContactAttempt } from "@/lib/actions/leads";
import type { Staff } from "@/generated/prisma/client";
import type { Dictionary, Locale } from "@/lib/i18n";

export function LogContactForm({
  leadId,
  section,
  trainers,
  t,
  locale,
}: {
  leadId: string;
  section: string | null;
  trainers: Staff[];
  t: Dictionary["logContactForm"];
  locale: Locale;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState("call");
  const [outcome, setOutcome] = useState("no_answer");
  const [lostReason, setLostReason] = useState("not_interested");
  const [trialDate, setTrialDate] = useState("");
  const [trialTime, setTrialTime] = useState("");
  const [trainerId, setTrainerId] = useState("none");
  const [notes, setNotes] = useState("");

  function onSubmit() {
    if (outcome === "booked_trial" && (!trialDate || !trialTime || trainerId === "none")) {
      toast.error(t.pickTrainerAndTime);
      return;
    }
    startTransition(async () => {
      try {
        await logContactAttempt({
          leadId,
          method: method as never,
          outcome: outcome as never,
          notes: notes.trim() || undefined,
          lostReason: outcome === "declined" ? (lostReason as never) : undefined,
          trialDatetime: outcome === "booked_trial" ? `${trialDate}T${trialTime}` : undefined,
          trialTrainerId: outcome === "booked_trial" ? trainerId : undefined,
        });
        toast.success(t.contactLogged);
        setNotes("");
        setTrialDate("");
        setTrialTime("");
        setTrainerId("none");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t.couldNotLog);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t.method}</Label>
            <Select value={method} onValueChange={(v) => v && setMethod(v)} disabled={isPending}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: string) => label(v, locale)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONTACT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {label(m, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t.outcome}</Label>
            <Select value={outcome} onValueChange={(v) => v && setOutcome(v)} disabled={isPending}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: string) => label(v, locale)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONTACT_OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {label(o, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {outcome === "declined" && (
          <div className="flex flex-col gap-1.5">
            <Label>{t.reason}</Label>
            <Select value={lostReason} onValueChange={(v) => v && setLostReason(v)} disabled={isPending}>
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

        {outcome === "booked_trial" && (
          <div className="flex flex-col gap-3">
            {!section && (
              <p className="text-xs text-amber-400">{t.setSectionFirst}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t.date}</Label>
                <Input
                  type="date"
                  value={trialDate}
                  onChange={(e) => setTrialDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t.time}</Label>
                <Input
                  type="time"
                  value={trialTime}
                  onChange={(e) => setTrialTime(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t.trainer}</Label>
                <Select
                  value={trainerId}
                  onValueChange={(v) => v && setTrainerId(v)}
                  disabled={isPending || !section}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) => (v === "none" ? t.choose : trainers.find((tr) => tr.id === v)?.name ?? v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      {t.choose}
                    </SelectItem>
                    {trainers.map((tr) => (
                      <SelectItem key={tr.id} value={tr.id}>
                        {tr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>{t.notesOptional}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            className="min-h-16"
            disabled={isPending}
          />
        </div>

        <Button onClick={onSubmit} disabled={isPending} className="w-fit">
          {isPending ? t.logging : t.logContact}
        </Button>
      </CardContent>
    </Card>
  );
}
