"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markClientsFinished } from "@/lib/actions/clients";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import type { Dictionary } from "@/lib/i18n";

export type FinishedClient = {
  id: string;
  name: string;
  phone: string;
  trainerName: string | null;
  /** Total bought across every package, for context on what they got through. */
  totalSessions: number;
  lastSessionOn: string | null;
};

/**
 * The people who used every session they paid for, offered for retiring.
 *
 * Nothing happens without a tick and a press. Finishing a package is the
 * moment to sell a renewal, so quietly moving these people out of the active
 * list would hide exactly the ones worth a phone call.
 */
export function FinishedClientsPanel({
  clients,
  title,
  emptyText,
  t,
}: {
  clients: FinishedClient[];
  title: string;
  emptyText: string;
  t: Dictionary["clientReview"];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const allSelected = clients.length > 0 && selected.size === clients.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(clients.map((c) => c.id)));
  }

  function onMark() {
    startTransition(async () => {
      try {
        const result = await markClientsFinished({ clientIds: [...selected] });
        setSelected(new Set());
        router.refresh();
        if (result.changed === 0) {
          toast.error(t.markedNone);
        } else if (result.skipped.length > 0) {
          toast.success(
            t.markedSome
              .replace("{changed}", String(result.changed))
              .replace("{skipped}", String(result.skipped.length))
          );
        } else {
          toast.success(t.markedAll.replace("{changed}", String(result.changed)));
        }
      } catch (err) {
        toast.error(friendlyErrorMessage(err, t.markFailed));
      }
    });
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{emptyText}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="secondary" className="tabular-nums">
            {clients.length}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleAll} disabled={isPending}>
            {allSelected ? t.clearSelection : t.selectAll}
          </Button>
          <Button size="sm" onClick={onMark} disabled={isPending || selected.size === 0}>
            {isPending
              ? t.savingLabel
              : selected.size > 0
                ? t.markCount.replace("{count}", String(selected.size))
                : t.markInactive}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {clients.map((client) => (
          <label
            key={client.id}
            className="flex cursor-pointer flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent/40"
          >
            <input
              type="checkbox"
              checked={selected.has(client.id)}
              onChange={() => toggle(client.id)}
              disabled={isPending}
              className="size-4 shrink-0 accent-primary"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={`/clients/${client.id}`}
                className="font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <bdi>{client.name}</bdi>
              </Link>
              <span className="text-xs text-muted-foreground">
                <bdi>{client.phone}</bdi>
                {client.trainerName && <> · <bdi>{client.trainerName}</bdi></>}
              </span>
            </div>
            <div className="flex flex-col items-end text-xs text-muted-foreground">
              <span className="tabular-nums">
                {t.sessionsUsed.replace("{count}", String(client.totalSessions))}
              </span>
              {client.lastSessionOn && (
                <span>
                  {t.lastOn} <bdi>{client.lastSessionOn}</bdi>
                </span>
              )}
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
