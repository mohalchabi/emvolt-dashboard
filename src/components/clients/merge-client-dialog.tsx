"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mergeClientInto } from "@/lib/actions/clients";
import type { Dictionary } from "@/lib/i18n";

export type MergeCandidate = {
  id: string;
  name: string;
  phone: string;
  /** Same phone as the record being merged — almost always the real duplicate. */
  samePhone: boolean;
};

/**
 * Folds this client record into another one and deletes this one.
 *
 * Deliberately worded around "this record disappears" rather than "merge",
 * because the destructive half is the part that has to be unambiguous: the
 * admin opens the duplicate and points it at the record they want to keep.
 */
export function MergeClientDialog({
  clientId,
  clientName,
  candidates,
  t,
}: {
  clientId: string;
  clientName: string;
  candidates: MergeCandidate[];
  t: Dictionary["clientDetail"];
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    if (!target) return;
    startTransition(async () => {
      try {
        const { targetClientId } = await mergeClientInto({
          sourceClientId: clientId,
          targetClientId: target,
        });
        setOpen(false);
        toast.success(t.merged);
        router.push(`/clients/${targetClientId}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.couldNotMerge);
      }
    });
  }

  const chosen = candidates.find((c) => c.id === target);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Merge className="size-4" />
            {t.mergeTrigger}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.mergeTitle}</DialogTitle>
          <DialogDescription>{t.mergeDesc}</DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.mergeNoCandidates}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="merge-target">{t.mergeInto}</Label>
              <Select value={target} onValueChange={(v) => setTarget(String(v ?? ""))}>
                <SelectTrigger id="merge-target" className="w-full">
                  <SelectValue placeholder={t.choose}>
                    {(v: string) => {
                      const c = candidates.find((x) => x.id === v);
                      return c ? `${c.name} · ${c.phone}` : t.choose;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex min-w-0 flex-col whitespace-normal py-0.5">
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.phone}
                          {c.samePhone ? ` · ${t.mergeSamePhone}` : ""}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chosen && (
              <p className="rounded-md border-s-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
                {t.mergeWarning
                  .replace("{source}", clientName)
                  .replace("{target}", chosen.name)}
              </p>
            )}
          </div>
        )}

        {candidates.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {t.cancel}
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={isPending || !target}>
              {isPending ? t.merging : t.mergeConfirm}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
