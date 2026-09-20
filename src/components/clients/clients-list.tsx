"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { CLIENT_STATUSES, label } from "@/lib/constants";
import { setClientsStatus } from "@/lib/actions/clients";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import type { Dictionary } from "@/lib/i18n";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  paused: "secondary",
  churned: "destructive",
};

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  section: string;
  status: string;
  trainerName: string | null;
  /** Sessions left across live packages, or null when none are live. */
  remaining: number | null;
  hasRenewalRequest: boolean;
  since: string;
};

/**
 * The clients list, with the tick boxes that let a manager retire a batch.
 *
 * Status is set from here rather than only on each client's own page because
 * the people who drift away do so in groups — a trainer leaves, a term ends —
 * and going through them one page at a time is why the list stays wrong.
 */
export function ClientsList({
  clients,
  canBulkEdit,
  t,
  emptyText,
}: {
  clients: ClientRow[];
  /** Front desk can read the list but not retire anyone. */
  canBulkEdit: boolean;
  t: Dictionary["clientsPage"];
  emptyText: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string>("churned");
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

  function onApply() {
    startTransition(async () => {
      try {
        const result = await setClientsStatus({ clientIds: [...selected], status });
        setSelected(new Set());
        router.refresh();
        toast.success(
          result.changed === 0
            ? t.bulkNoChange
            : t.bulkDone
                .replace("{count}", String(result.changed))
                .replace("{status}", label(status))
        );
      } catch (err) {
        toast.error(friendlyErrorMessage(err, t.bulkFailed));
      }
    });
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{emptyText}</CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canBulkEdit && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
          <span className="text-sm font-medium">
            {t.bulkSelected.replace("{count}", String(selected.size))}
          </span>
          <Select value={status} onValueChange={(v) => v && setStatus(String(v))}>
            <SelectTrigger className="w-36">
              <SelectValue>{(v: string) => label(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CLIENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {label(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={onApply} disabled={isPending}>
            {isPending ? t.bulkSaving : t.bulkApply}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={isPending}>
            {t.bulkClear}
          </Button>
        </div>
      )}

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-2 sm:hidden">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex items-start gap-2 rounded-lg border bg-card p-3"
          >
            {canBulkEdit && (
              <Checkbox
                checked={selected.has(client.id)}
                onCheckedChange={() => toggle(client.id)}
                aria-label={client.name}
                className="mt-1"
              />
            )}
            <Link href={`/clients/${client.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  <bdi>{client.name}</bdi>
                </span>
                <div className="flex gap-1">
                  {client.hasRenewalRequest && (
                    <Badge variant="outline" className="border-amber-500/60 text-amber-400">
                      {t.renewalRequested}
                    </Badge>
                  )}
                  <Badge variant={STATUS_VARIANT[client.status]}>{label(client.status)}</Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <bdi>{client.phone}</bdi> · {label(client.section)}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{client.trainerName ?? t.unassigned}</span>
                {client.remaining === null ? (
                  <span>{t.noActivePackage}</span>
                ) : (
                  <span className={client.remaining <= 2 ? "font-medium text-destructive" : ""}>
                    {client.remaining} {t.sessionsLeft}
                  </span>
                )}
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
                {canBulkEdit && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label={t.selectAll}
                    />
                  </TableHead>
                )}
                <TableHead>{t.colName}</TableHead>
                <TableHead>{t.colPhone}</TableHead>
                <TableHead>{t.colSection}</TableHead>
                <TableHead>{t.colStatus}</TableHead>
                <TableHead>{t.colTrainer}</TableHead>
                <TableHead>{t.colSessionsLeft}</TableHead>
                <TableHead>{t.colClientSince}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  data-state={selected.has(client.id) ? "selected" : undefined}
                >
                  {canBulkEdit && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(client.id)}
                        onCheckedChange={() => toggle(client.id)}
                        aria-label={client.name}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                        <bdi>{client.name}</bdi>
                      </Link>
                      {client.hasRenewalRequest && (
                        <Badge variant="outline" className="border-amber-500/60 text-amber-400">
                          {t.renewalRequested}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <bdi>{client.phone}</bdi>
                  </TableCell>
                  <TableCell>{label(client.section)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[client.status]}>{label(client.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.trainerName ?? t.unassigned}
                  </TableCell>
                  <TableCell>
                    {client.remaining === null ? (
                      <span className="text-muted-foreground">{t.noActivePackage}</span>
                    ) : (
                      <span
                        className={client.remaining <= 2 ? "font-medium text-destructive" : ""}
                      >
                        {client.remaining}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.since}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
