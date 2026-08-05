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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WALLET_CATEGORIES, PETTY_CASH_CATEGORY, label } from "@/lib/constants";
import { recordWalletTransaction } from "@/lib/actions/wallet";
import { localDateString } from "@/lib/utils";

const OTHER_PAYEE = "__other";

export function RecordPaymentDialog({ staff }: { staff: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>("salary");
  const [payee, setPayee] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  // A petty cash float is reconciled against the invoices its holder brings
  // back, so it can only be issued to someone on staff.
  const isPettyCash = category === PETTY_CASH_CATEGORY;

  function onCategoryChange(next: string) {
    setCategory(next);
    if (next === PETTY_CASH_CATEGORY && payee === OTHER_PAYEE) setPayee("");
  }

  function reset() {
    formRef.current?.reset();
    setCategory("salary");
    setPayee("");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The selects are Base UI popups rendered in a portal, so their values are
    // carried in React state and merged in here rather than read off the form.
    const formData = new FormData(event.currentTarget);
    formData.set("category", category);
    formData.set("payeeStaffId", payee === OTHER_PAYEE ? "" : payee);

    startTransition(async () => {
      try {
        await recordWalletTransaction(formData);
        setOpen(false);
        reset();
        router.refresh();
        toast.success("Payment recorded.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not record the payment.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary">Record Payment</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a Payment</DialogTitle>
          <DialogDescription>
            Money going out of the wallet — a salary, a petty cash float, rent. Attach the bank
            transfer or receipt.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-amount">Amount (SAR)</Label>
              <Input
                id="payment-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-paidAt">Date paid</Label>
              <Input
                id="payment-paidAt"
                name="paidAt"
                type="date"
                required
                defaultValue={localDateString(new Date())}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>What for</Label>
            <Select value={category} onValueChange={(v) => v && onCategoryChange(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: string) => label(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {WALLET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {label(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Paid to</Label>
            <Select value={payee} onValueChange={(v) => setPayee(String(v ?? ""))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose...">
                  {(v: string) =>
                    v === OTHER_PAYEE
                      ? "Someone else"
                      : (staff.find((s) => s.id === v)?.name ?? "Choose...")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                {!isPettyCash && <SelectItem value={OTHER_PAYEE}>Someone else</SelectItem>}
              </SelectContent>
            </Select>
            {isPettyCash && (
              <p className="text-xs text-muted-foreground">
                Petty cash is issued to a staff member so their invoices can be matched against it.
              </p>
            )}
          </div>

          {payee === OTHER_PAYEE && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-payeeName">Name</Label>
              <Input
                id="payment-payeeName"
                name="payeeName"
                placeholder="e.g. Landlord, supplier"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-note">Note (optional)</Label>
            <Textarea
              id="payment-note"
              name="note"
              rows={2}
              placeholder="e.g. July salary, float for cleaning supplies"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-files">Bank transfer or receipt</Label>
            <Input
              id="payment-files"
              name="files"
              type="file"
              accept="image/*,application/pdf"
              multiple
              required
            />
            <p className="text-xs text-muted-foreground">PDF or photo, 4.5 MB per upload.</p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
