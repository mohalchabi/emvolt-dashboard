"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAINING_TYPES, label, type TrainingType } from "@/lib/constants";

export type SessionSlot = { date: string; time: string };

export function emptySlots(count: number): SessionSlot[] {
  return Array.from({ length: count }, () => ({ date: "", time: "" }));
}

// Extracts the filled-in slots as ISO-ish "YYYY-MM-DDTHH:mm" datetime strings,
// skipping any the trainer left blank (scheduling upfront is optional).
export function filledDatetimes(slots: SessionSlot[]): string[] {
  return slots.filter((s) => s.date && s.time).map((s) => `${s.date}T${s.time}`);
}

export function SessionDatesFields({
  enabled,
  onEnabledChange,
  totalSessions,
  sessionType,
  onSessionTypeChange,
  slots,
  onSlotsChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  totalSessions: number;
  sessionType: TrainingType;
  onSessionTypeChange: (t: TrainingType) => void;
  slots: SessionSlot[];
  onSlotsChange: (slots: SessionSlot[]) => void;
}) {
  function updateSlot(i: number, patch: Partial<SessionSlot>) {
    const next = slots.slice();
    next[i] = { ...next[i], ...patch };
    onSlotsChange(next);
  }

  function fillWeekly() {
    const first = slots[0];
    if (!first?.date || !first?.time) return;
    const start = new Date(`${first.date}T${first.time}`);
    if (Number.isNaN(start.getTime())) return;
    const next = slots.map((s, i) => {
      if (i === 0 || (s.date && s.time)) return s;
      const d = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      return { date: d.toISOString().slice(0, 10), time: first.time };
    });
    onSlotsChange(next);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={enabled} onCheckedChange={(c) => onEnabledChange(c === true)} />
        Schedule sessions now (optional)
      </label>

      {enabled && (
        <>
          <div className="flex items-center justify-between gap-3">
            <Label className="shrink-0">Session type</Label>
            <Select value={sessionType} onValueChange={(v) => v && onSessionTypeChange(v as TrainingType)}>
              <SelectTrigger className="w-40">
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

          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {slots.map((s, i) => (
              <div key={i} className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-2">
                <span className="text-xs text-muted-foreground">#{i + 1}</span>
                <Input type="date" value={s.date} onChange={(e) => updateSlot(i, { date: e.target.value })} />
                <Input type="time" value={s.time} onChange={(e) => updateSlot(i, { time: e.target.value })} />
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={fillWeekly} className="self-start">
            Repeat weekly from #1
          </Button>
          <p className="text-xs text-muted-foreground">
            Leave any date blank to book it later from the client&apos;s profile instead. Showing{" "}
            {totalSessions} session{totalSessions === 1 ? "" : "s"}.
          </p>
        </>
      )}
    </div>
  );
}
