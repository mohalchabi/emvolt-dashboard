"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAINING_TYPES, label } from "@/lib/constants";
import { bookSession } from "@/lib/actions/portal";
import { localDateString } from "@/lib/utils";

export function BookSessionForm({
  packages,
  date,
  slots,
}: {
  packages: { id: string; name: string }[];
  date: string;
  slots: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [type, setType] = useState<string>(TRAINING_TYPES[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  function onDateChange(value: string) {
    router.push(`${pathname}?date=${value}`);
  }

  function onConfirm() {
    if (!selectedSlot || !packageId) return;
    startTransition(async () => {
      try {
        await bookSession({ packageId, type: type as never, datetime: selectedSlot });
        toast.success("Session booked.");
        router.push("/portal/classes");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not book that session.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Package</Label>
          <Select value={packageId} onValueChange={(v) => v && setPackageId(v)} disabled={isPending}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => packages.find((p) => p.id === v)?.name ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {packages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => v && setType(v)} disabled={isPending}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => label(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TRAINING_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {label(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            min={localDateString(new Date())}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Available times</Label>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open times on this date — try another day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const d = new Date(slot);
              const isSelected = selectedSlot === slot;
              return (
                <Button
                  key={slot}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSlot(slot)}
                  disabled={isPending}
                >
                  {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <Button onClick={onConfirm} disabled={isPending || !selectedSlot} className="w-fit">
        {isPending ? "Booking..." : "Confirm booking"}
      </Button>
    </div>
  );
}
