"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Plus, Trash2 } from "lucide-react";
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
  addWalletReceipts,
  deleteWalletAttachment,
  deleteWalletDeposit,
  deleteWalletTransaction,
  deletePettyCashExpense,
} from "@/lib/actions/wallet";

export type WalletEntryKind = "deposit" | "transaction" | "petty_cash_expense";

export type EntryAttachment = { id: string; fileName: string };

export function WalletEntryActions({
  kind,
  entryId,
  label,
  attachments,
  canDelete = true,
}: {
  kind: WalletEntryKind;
  entryId: string;
  /** What the entry is, for the confirmation copy — e.g. "Salary — Emad". */
  label: string;
  attachments: EntryAttachment[];
  /** False hides the delete control for a role the action would reject anyway. */
  canDelete?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {attachments.map((attachment, index) => (
        <a
          key={attachment.id}
          href={`/api/wallet-attachments/${attachment.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title={attachment.fileName}
          className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Paperclip className="size-3" />
          {index + 1}
        </a>
      ))}
      <DocumentsDialog kind={kind} entryId={entryId} attachments={attachments} />
      {canDelete && <DeleteEntryButton kind={kind} entryId={entryId} label={label} />}
    </div>
  );
}

function DocumentsDialog({
  kind,
  entryId,
  attachments,
}: {
  kind: WalletEntryKind;
  entryId: string;
  attachments: EntryAttachment[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("kind", kind);
    formData.set("entryId", entryId);

    startTransition(async () => {
      try {
        await addWalletReceipts(formData);
        formRef.current?.reset();
        router.refresh();
        toast.success("Document added.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add the document.");
      }
    });
  }

  function onDelete(attachmentId: string) {
    startTransition(async () => {
      try {
        await deleteWalletAttachment({ attachmentId });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove the document.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Manage documents" className="px-1.5">
            <Plus className="size-3.5" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Documents</DialogTitle>
          <DialogDescription>
            Bank transfers and invoices backing this entry. Add as many as you need.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
            >
              <a
                href={`/api/wallet-attachments/${attachment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-primary hover:underline"
              >
                {attachment.fileName}
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(attachment.id)}
                disabled={isPending}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <form ref={formRef} onSubmit={onUpload} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`files-${entryId}`}>Add a document</Label>
            <Input
              id={`files-${entryId}`}
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
              {isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteEntryButton({
  kind,
  entryId,
  label,
}: {
  kind: WalletEntryKind;
  entryId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      try {
        if (kind === "deposit") await deleteWalletDeposit({ depositId: entryId });
        else if (kind === "transaction") await deleteWalletTransaction({ transactionId: entryId });
        else await deletePettyCashExpense({ expenseId: entryId });
        setOpen(false);
        router.refresh();
        toast.success("Entry deleted.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete the entry.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Delete entry" className="px-1.5">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this entry?</DialogTitle>
          <DialogDescription>
            {label} will be removed from the ledger along with its documents, and the balance will
            be recalculated.
            {kind === "transaction" &&
              " Any petty cash invoices recorded against it are deleted too."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
