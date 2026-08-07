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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookClientSession } from "@/lib/actions/clients";
import { TRAINING_TYPES, label, type TrainingType } from "@/lib/constants";
import type { Dictionary, Locale } from "@/lib/i18n";

type EligiblePackage = { id: string; name: string; remaining: number };

export function BookSessionDialog({
  clientId,
  packages,
  locale,
  t,
}: {
  clientId: string;
  packages: EligiblePackage[];
  locale: Locale;
  t: Dictionary["clientDetail"];
}) {
  const [open, setOpen] = useState(false);
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [type, setType] = useState<TrainingType>(TRAINING_TYPES[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasEligiblePackage = packages.length > 0;

  function onSubmit() {
    if (!date || !time || !packageId) return;
    startTransition(async () => {
      try {
        await bookClientSession({ clientId, packageId, type, datetime: `${date}T${time}` });
        toast.success("Session booked.");
        setOpen(false);
        setDate("");
        setTime("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not book session.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary">{t.bookSession}</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.bookSession}</DialogTitle>
          <DialogDescription>{t.bookSessionDesc}</DialogDescription>
        </DialogHeader>

        {!hasEligiblePackage ? (
          <p className="text-sm text-muted-foreground">
            {t.noEligiblePackages}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t.package}</Label>
              <Select value={packageId} onValueChange={(v) => v && setPackageId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => packages.find((p) => p.id === v)?.name ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.remaining} left)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t.type}</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as TrainingType)}>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t.date}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t.time}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={onSubmit} disabled={isPending || !date || !time}>
                {isPending ? t.booking : t.bookSession}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
