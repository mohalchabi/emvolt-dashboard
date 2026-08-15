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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordPettyCashExpense } from "@/lib/actions/wallet";
import { localDateString } from "@/lib/utils";
import { formatSar } from "@/lib/wallet";

/**
 * Logs one purchase made out of a petty cash float, with the supplier's VAT
 * invoice attached. Always opened from the float it's being spent against, so
 * the float is passed in rather than picked.
 */
export function RecordPettyCashBillDialog({
  issueId,
  holderName,
  remaining,
  holderId,
  staff,
}: {
  issueId: string;
  holderName: string;
  remaining: number;
  /** The float's holder — who a purchase belongs to unless told otherwise. */
  holderId: string | null;
  staff: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [spentBy, setSpentBy] = useState(holderId ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("issueId", issueId);
    formData.set("spentById", spentBy);

    startTransition(async () => {
      try {
        await recordPettyCashExpense(formData);
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
        toast.success("Invoice recorded.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not record the invoice.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary" size="sm">Add Invoice</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a VAT Invoice</DialogTitle>
          <DialogDescription>
            Something {holderName} bought with this float. {formatSar(remaining)} of it is still
            unaccounted for.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`bill-vendor-${issueId}`}>Bought from</Label>
              <Input
                id={`bill-vendor-${issueId}`}
                name="vendor"
                placeholder="e.g. Panda, Jarir"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`bill-spentAt-${issueId}`}>Date on invoice</Label>
              <Input
                id={`bill-spentAt-${issueId}`}
                name="spentAt"
                type="date"
                required
                defaultValue={localDateString(new Date())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`bill-amount-${issueId}`}>Total paid (SAR)</Label>
              <Input
                id={`bill-amount-${issueId}`}
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`bill-vatAmount-${issueId}`}>Of which VAT (optional)</Label>
              <Input
                id={`bill-vatAmount-${issueId}`}
                name="vatAmount"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Floats get shared around the gym, so who spent it isn't always who
              carries it. Defaults to the holder — change it only when someone
              else made the purchase, or spend-per-person reports go wrong. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`bill-spentBy-${issueId}`}>Who bought it</Label>
            <Select value={spentBy} onValueChange={(v) => setSpentBy(String(v ?? ""))}>
              <SelectTrigger id={`bill-spentBy-${issueId}`} className="w-full">
                <SelectValue placeholder="Choose...">
                  {(v: string) => staff.find((s) => s.id === v)?.name ?? "Choose..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`bill-vatNumber-${issueId}`}>Supplier VAT number (optional)</Label>
            <Input
              id={`bill-vatNumber-${issueId}`}
              name="vatNumber"
              placeholder="From the top of the invoice"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`bill-description-${issueId}`}>What was bought (optional)</Label>
            <Textarea
              id={`bill-description-${issueId}`}
              name="description"
              rows={2}
              placeholder="e.g. cleaning supplies, water for the studio"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`bill-files-${issueId}`}>Invoice (optional)</Label>
            <Input
              id={`bill-files-${issueId}`}
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
              {isPending ? "Saving..." : "Add Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
