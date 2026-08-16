"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, LogOut, MapPin, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clockIn, clockOut } from "@/lib/actions/attendance";
import { DEPARTURE_REASONS, label } from "@/lib/constants";
import type { Dictionary, Locale } from "@/lib/i18n";

const NORMAL_END = "normal";

/**
 * Reads the device position, then clocks in or out.
 *
 * Location is a precondition, not a bonus: if the browser refuses or fails, the
 * server action is never called and nothing is written. That is the point of
 * the feature, so the failure is stated plainly with what to do about it rather
 * than falling back to a positionless event.
 */
export function ClockCard({
  isClockedIn,
  sinceLabel,
  t,
  locale,
}: {
  isClockedIn: boolean;
  /** When the current shift started, already formatted server-side. */
  sinceLabel: string | null;
  t: Dictionary["attendance"];
  locale: Locale;
}) {
  const [isPending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOpen, setOutOpen] = useState(false);
  const [reason, setReason] = useState<string>(NORMAL_END);
  const router = useRouter();

  const busy = isPending || locating;

  function position(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error(t.locationUnsupported));
        return;
      }

      // The API's own `timeout` only starts counting once permission has been
      // decided, so a prompt left sitting on screen never fires it and neither
      // callback ever runs. Without our own watchdog the button would spin
      // forever on a phone whose owner tapped away from the prompt.
      let settled = false;
      const watchdog = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(t.locationTimeout));
      }, 25000);

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        fn();
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => finish(() => resolve(pos)),
        (err) =>
          finish(() => {
            // These map to real, different things the person can act on: turn
            // the permission back on, step outside, or simply try again.
            if (err.code === err.PERMISSION_DENIED) reject(new Error(t.locationDenied));
            else if (err.code === err.POSITION_UNAVAILABLE) reject(new Error(t.locationUnavailable));
            else if (err.code === err.TIMEOUT) reject(new Error(t.locationTimeout));
            else reject(new Error(t.locationUnavailable));
          }),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  }

  async function run(kind: "in" | "out", departureReason: string | null) {
    setError(null);
    setLocating(true);
    let pos: GeolocationPosition;
    try {
      pos = await position();
    } catch (err) {
      setLocating(false);
      setError(err instanceof Error ? err.message : t.locationUnavailable);
      return;
    }
    setLocating(false);

    const payload = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
      departureReason: departureReason as never,
    };

    startTransition(async () => {
      try {
        if (kind === "in") await clockIn(payload);
        else await clockOut(payload);
        setOutOpen(false);
        setReason(NORMAL_END);
        toast.success(kind === "in" ? t.clockedInOk : t.clockedOutOk);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : t.couldNotRecord;
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`size-3 shrink-0 rounded-full ${isClockedIn ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
            />
            <div className="flex flex-col">
              <span className="font-medium">
                {isClockedIn ? t.onShift : t.offShift}
              </span>
              {isClockedIn && sinceLabel && (
                <span className="text-xs text-muted-foreground">
                  {t.since} <bdi>{sinceLabel}</bdi>
                </span>
              )}
            </div>
          </div>

          {isClockedIn ? (
            <Button size="lg" variant="destructive" disabled={busy} onClick={() => setOutOpen(true)}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              {t.clockOut}
            </Button>
          ) : (
            <Button size="lg" disabled={busy} onClick={() => run("in", null)}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {locating ? t.locating : t.clockIn}
            </Button>
          )}

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {t.locationRequired}
          </p>

          {error && (
            <p className="rounded-md border-s-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={outOpen} onOpenChange={(o) => !busy && setOutOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.clockOut}</DialogTitle>
            <DialogDescription>{t.reasonDesc}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clock-out-reason">{t.reasonLabel}</Label>
            <Select value={reason} onValueChange={(v) => setReason(String(v ?? NORMAL_END))}>
              <SelectTrigger id="clock-out-reason" className="w-full">
                <SelectValue>
                  {(v: string) => (v === NORMAL_END ? t.normalEnd : label(v, locale))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NORMAL_END}>{t.normalEnd}</SelectItem>
                {DEPARTURE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {label(r, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-md border-s-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOutOpen(false)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => run("out", reason === NORMAL_END ? null : reason)}
            >
              {locating ? t.locating : isPending ? t.saving : t.confirmOut}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
