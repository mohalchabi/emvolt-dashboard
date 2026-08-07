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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CLIENT_STATUSES, label } from "@/lib/constants";
import { updateClientStatus, assignTrainer, addClientNote } from "@/lib/actions/clients";
import { updateClientIdNumber } from "@/lib/actions/documents";
import type { Staff, ActivityLog, Client } from "@/generated/prisma/client";
import type { Dictionary, Locale } from "@/lib/i18n";

type Props = {
  client: Client;
  trainers: Staff[];
  logs: (ActivityLog & { author: Staff })[];
  canManage: boolean;
  // `dict`, not `t`: `t` is already the loop variable for trainers below.
  dict: Dictionary["clientDetail"];
  locale: Locale;
};

export function ClientDetailPanel({ client, trainers, logs, canManage, dict, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  function onStatusChange(status: string) {
    startTransition(async () => {
      try {
        await updateClientStatus({ clientId: client.id, status });
        router.refresh();
      } catch {
        toast.error("Could not update status.");
      }
    });
  }

  function onTrainerChange(trainerId: string) {
    startTransition(async () => {
      try {
        await assignTrainer({ clientId: client.id, assignedTrainerId: trainerId === "none" ? null : trainerId });
        router.refresh();
      } catch {
        toast.error("Could not reassign trainer.");
      }
    });
  }

  function onIdNumberBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    if (value === (client.idNumber ?? "")) return;
    startTransition(async () => {
      try {
        await updateClientIdNumber({ clientId: client.id, idNumber: value });
        router.refresh();
      } catch {
        toast.error("Could not update ID number.");
      }
    });
  }

  function onAddNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      try {
        await addClientNote({ clientId: client.id, text: note.trim() });
        setNote("");
        router.refresh();
      } catch {
        toast.error("Could not add note.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{dict.statusTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{dict.statusTitle}</Label>
            <Select value={client.status} onValueChange={(v) => v && onStatusChange(v)} disabled={isPending || !canManage}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: string) => label(v, locale)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {label(s, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{dict.trainerLabel}</Label>
            <Select
              value={client.assignedTrainerId ?? "none"}
              onValueChange={(v) => v && onTrainerChange(v)}
              disabled={isPending || !canManage}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) => (v === "none" ? dict.unassigned : trainers.find((t) => t.id === v)?.name ?? v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{dict.unassigned}</SelectItem>
                {trainers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="idNumber">{dict.idNumberLabel}</Label>
            <Input
              id="idNumber"
              key={client.idNumber}
              defaultValue={client.idNumber ?? ""}
              onBlur={onIdNumberBlur}
              disabled={isPending}
              placeholder="e.g. 1234567890"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.activityTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Textarea
              placeholder={dict.addNotePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-16"
            />
            <Button onClick={onAddNote} disabled={isPending || !note.trim()} className="self-end">
              {dict.addNote}
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
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
