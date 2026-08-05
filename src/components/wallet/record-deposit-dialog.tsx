"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { recordWalletDeposit } from "@/lib/actions/wallet";
import { localDateString } from "@/lib/utils";

export function RecordDepositDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await recordWalletDeposit(formData);
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
        toast.success("Money added to the wallet.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add the money.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add Money</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Money to the Wallet</DialogTitle>
          <DialogDescription>
            Record money you received — the monthly funding for salaries and petty cash, or
            anything extra. Attach the bank transfer if you have it.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deposit-amount">Amount (SAR)</Label>
              <Input
                id="deposit-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deposit-receivedAt">Date received</Label>
              <Input
                id="deposit-receivedAt"
                name="receivedAt"
                type="date"
                required
                defaultValue={localDateString(new Date())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deposit-receivedFrom">From (optional)</Label>
              <Input id="deposit-receivedFrom" name="receivedFrom" placeholder="e.g. Owner" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deposit-reference">Bank reference (optional)</Label>
              <Input id="deposit-reference" name="reference" placeholder="Transfer number" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-note">Note (optional)</Label>
            <Textarea
              id="deposit-note"
              name="note"
              rows={2}
              placeholder="What this transfer is meant to cover"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-files">Bank transfer (optional)</Label>
            <Input
              id="deposit-files"
              name="files"
              type="file"
              accept="image/*,application/pdf"
              multiple
            />
            <p className="text-xs text-muted-foreground">
              PDF or photo, 4.5 MB per upload. You can add it later.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Add Money"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
