"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordOwnPettyCashExpense } from "@/lib/actions/wallet";
import { localDateString } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

/**
 * The holder's own version of RecordPettyCashBillDialog: same purchase, filed
 * by the person who made it instead of by an admin working from a pile of
 * receipts.
 *
 * Two deliberate differences from the admin dialog. The invoice is required
 * rather than optional — the holder has the bill on them, and an expense
 * without one is what the admin is chasing in the first place. And the copy
 * comes in from the page so it follows the language the user picked, since
 * this screen is aimed at trainers rather than the office.
 */
export function RecordOwnPettyCashBillDialog({
  issueId,
  t,
}: {
  issueId: string;
  t: Dictionary["myPettyCash"];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("issueId", issueId);

    startTransition(async () => {
      try {
        await recordOwnPettyCashExpense(formData);
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
        toast.success(t.saved);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.couldNotSave);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            {t.addPurchase}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.dialogTitle}</DialogTitle>
          <DialogDescription>{t.dialogDesc}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`own-vendor-${issueId}`}>{t.vendor}</Label>
              <Input
                id={`own-vendor-${issueId}`}
                name="vendor"
                placeholder={t.vendorPlaceholder}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`own-spentAt-${issueId}`}>{t.spentAt}</Label>
              <Input
                id={`own-spentAt-${issueId}`}
                name="spentAt"
                type="date"
                required
                defaultValue={localDateString(new Date())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`own-amount-${issueId}`}>{t.amount}</Label>
              <Input
                id={`own-amount-${issueId}`}
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`own-vatAmount-${issueId}`}>{t.vatAmount}</Label>
              <Input
                id={`own-vatAmount-${issueId}`}
                name="vatAmount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`own-description-${issueId}`}>{t.description}</Label>
            <Textarea
              id={`own-description-${issueId}`}
              name="description"
              rows={2}
              placeholder={t.descriptionPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`own-files-${issueId}`}>{t.invoice}</Label>
            {/* No `capture` attribute on purpose: it would force the camera open
                and drop the gallery and Files options on most mobile browsers.
                Left off, the OS picker offers camera, gallery and PDF together. */}
            <Input
              id={`own-files-${issueId}`}
              name="files"
              type="file"
              accept="image/*,application/pdf"
              multiple
              required
            />
            <p className="text-xs text-muted-foreground">{t.invoiceHint}</p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
