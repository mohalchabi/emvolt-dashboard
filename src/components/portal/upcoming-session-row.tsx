"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/constants";
import { cancelSession, rescheduleSession, getSlotsForClientTrainer } from "@/lib/actions/portal";
import { localDateString } from "@/lib/utils";
import type { Session } from "@/generated/prisma/client";

export function UpcomingSessionRow({ session, trainerName }: { session: Session; trainerName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [date, setDate] = useState(localDateString(session.datetime));
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  function loadSlots(nextDate: string) {
    setDate(nextDate);
    setSelectedSlot(null);
    setLoadingSlots(true);
    startTransition(async () => {
      try {
        const result = await getSlotsForClientTrainer(nextDate);
        setSlots(result);
      } finally {
        setLoadingSlots(false);
      }
    });
  }

  function onOpenReschedule(open: boolean) {
    setRescheduleOpen(open);
    if (open) loadSlots(date);
  }

  function onConfirmReschedule() {
    if (!selectedSlot) return;
    startTransition(async () => {
      try {
        await rescheduleSession({ sessionId: session.id, datetime: selectedSlot });
        toast.success("Session moved.");
        setRescheduleOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not move that session.");
      }
    });
  }

  function onConfirmCancel() {
    startTransition(async () => {
      try {
        await cancelSession({ sessionId: session.id });
        toast.success("Session cancelled.");
        setCancelOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not cancel that session.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{label(session.type)}</Badge>
          <span className="font-medium">with {trainerName}</span>
        </div>
        <span className="text-muted-foreground">
          {session.datetime.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} at{" "}
          {session.datetime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      <div className="flex shrink-0 gap-2">
        <Dialog open={rescheduleOpen} onOpenChange={onOpenReschedule}>
          <DialogTrigger render={<Button variant="outline" size="sm" disabled={isPending}>Move</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Move session</DialogTitle>
              <DialogDescription>Pick a new date and time with {trainerName}.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  min={localDateString(new Date())}
                  onChange={(e) => loadSlots(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Available times</Label>
                {loadingSlots ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open times on this date — try another day.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => {
                      const d = new Date(slot);
                      return (
                        <Button
                          key={slot}
                          type="button"
                          variant={selectedSlot === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onConfirmReschedule} disabled={isPending || !selectedSlot}>
                {isPending ? "Moving..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger
            render={
              <Button variant="ghost" size="sm" disabled={isPending} className="text-muted-foreground hover:text-destructive">
                Cancel
              </Button>
            }
          />
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Cancel this session?</DialogTitle>
              <DialogDescription>
                Your {label(session.type)} session on{" "}
                {session.datetime.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} at{" "}
                {session.datetime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} will be cancelled.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" onClick={onConfirmCancel} disabled={isPending}>
                {isPending ? "Cancelling..." : "Cancel session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
