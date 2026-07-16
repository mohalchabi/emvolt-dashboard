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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadInBodyResult, deleteInBodyResult } from "@/lib/actions/inbody";
import type { InBodyResult, Staff } from "@/generated/prisma/client";

type Result = InBodyResult & { uploadedBy: Staff };

export function InbodyPanel({ clientId, results }: { clientId: string; results: Result[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await uploadInBodyResult(formData);
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
        toast.success("InBody result uploaded.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not upload result.");
      }
    });
  }

  function onDelete(resultId: string) {
    startTransition(async () => {
      try {
        await deleteInBodyResult({ resultId, clientId });
        router.refresh();
      } catch {
        toast.error("Could not delete result.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>InBody Results</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="secondary">Upload Result</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload InBody Result</DialogTitle>
              <DialogDescription>
                Attach the scan (photo or PDF of the printout) and the date it was taken.
              </DialogDescription>
            </DialogHeader>
            <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="clientId" value={clientId} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="takenAt">Scan date</Label>
                <Input id="takenAt" name="takenAt" type="date" required max={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="file">File</Label>
                <Input id="file" name="file" type="file" accept="image/*,application/pdf" required />
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
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground">No InBody results uploaded yet.</p>
        )}
        {results.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
            <div className="min-w-0">
              <a
                href={`/api/inbody/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {r.takenAt.toLocaleDateString()}
              </a>
              <div className="truncate text-xs text-muted-foreground">
                {r.fileName} · uploaded by {r.uploadedBy.name}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(r.id)}
              disabled={isPending}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              Delete
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
