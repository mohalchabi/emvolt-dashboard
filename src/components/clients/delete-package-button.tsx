"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deletePackage } from "@/lib/actions/clients";
import type { Dictionary } from "@/lib/i18n";

/**
 * Removes a package that was recorded wrongly.
 *
 * The confirmation names the package and says plainly what happens to any
 * sessions booked against it, because "delete" reads as "delete everything"
 * and that is exactly what this does not do.
 */
export function DeletePackageButton({
  packageId,
  packageName,
  sessionCount,
  t,
}: {
  packageId: string;
  packageName: string;
  /** Sessions booked against this package — they survive, unlinked. */
  sessionCount: number;
  t: Dictionary["clientDetail"];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      try {
        await deletePackage({ packageId });
        setOpen(false);
        toast.success(t.packageDeleted);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.couldNotDeletePackage);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={t.deletePackage}
            className="px-1.5 text-muted-foreground hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.deletePackage}</DialogTitle>
          <DialogDescription>
            {t.deletePackageDesc.replace("{name}", packageName)}
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-md border-s-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
          {sessionCount > 0
            ? t.deletePackageSessions.replace("{count}", String(sessionCount))
            : t.deletePackageNoSessions}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {t.cancel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? t.deletingPackage : t.deletePackage}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
