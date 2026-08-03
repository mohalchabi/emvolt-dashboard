"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadClientDocument, deleteClientDocument } from "@/lib/actions/documents";
import type { ClientDocument, Staff } from "@/generated/prisma/client";

type Doc = ClientDocument & { uploadedBy: Staff };

function DocumentSection({
  clientId,
  type,
  title,
  docs,
}: {
  clientId: string;
  type: "contract" | "id_document";
  title: string;
  docs: Doc[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await uploadClientDocument(formData);
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
        toast.success(`${title} uploaded.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not upload document.");
      }
    });
  }

  function onDelete(documentId: string) {
    startTransition(async () => {
      try {
        await deleteClientDocument({ documentId, clientId });
        router.refresh();
      } catch {
        toast.error("Could not delete document.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="secondary" size="sm">Upload</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload {title}</DialogTitle>
              <DialogDescription>Attach a photo or PDF copy.</DialogDescription>
            </DialogHeader>
            <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="type" value={type} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`file-${type}`}>File</Label>
                <Input id={`file-${type}`} name="file" type="file" accept="image/*,application/pdf" required />
                <p className="text-xs text-muted-foreground">Max 4.5 MB.</p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {docs.length === 0 && <p className="text-xs text-muted-foreground">None uploaded yet.</p>}
      {docs.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
          <a
            href={`/api/documents/${d.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate text-primary hover:underline"
          >
            {d.fileName}
          </a>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span>{d.createdAt.toLocaleDateString()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(d.id)}
              disabled={isPending}
              className="h-auto p-1 text-muted-foreground hover:text-destructive"
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentsPanel({
  clientId,
  contracts,
  idDocuments,
}: {
  clientId: string;
  contracts: Doc[];
  idDocuments: Doc[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DocumentSection clientId={clientId} type="contract" title="Contract" docs={contracts} />
        <div className="h-px bg-border" />
        <DocumentSection clientId={clientId} type="id_document" title="ID Document" docs={idDocuments} />
      </CardContent>
    </Card>
  );
}
