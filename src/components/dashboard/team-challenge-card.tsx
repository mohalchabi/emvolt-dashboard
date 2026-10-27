"use client";

import { useState, useSyncExternalStore } from "react";
import { Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TeamChallenge } from "@/lib/team-challenge";
import type { Dictionary } from "@/lib/i18n";

const PIECES = 90;
const COLOURS = ["#38bdf8", "#f59e0b", "#34d399", "#f472b6", "#a78bfa", "#fbbf24"];

/**
 * Confetti scattered by a hash of its index rather than by Math.random.
 *
 * Random during render is impure — it gives the server and the browser
 * different answers and React rightly objects. A hash looks every bit as
 * scattered and gives both the same one.
 */
function scatter(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const CONFETTI = Array.from({ length: PIECES }, (_, i) => ({
  left: scatter(i, 1) * 100,
  delay: scatter(i, 2) * 1.2,
  duration: 2.8 + scatter(i, 3) * 2,
  colour: COLOURS[i % COLOURS.length],
  size: 6 + scatter(i, 4) * 7,
  tilt: scatter(i, 5) * 360,
}));

/**
 * Whether this device has already seen this month's celebration.
 *
 * localStorage is an external store, so it is read through the API meant for
 * them rather than copied into state by an effect. The server snapshot says
 * "seen", so nothing flashes on the way to hydration.
 */
function useAlreadyCelebrated(key: string): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        // Private windows and blocked site data throw. Congratulating someone
        // twice is a far better failure than never congratulating them.
        return false;
      }
    },
    () => true
  );
}

/**
 * The shared score, and the fuss when it is reached.
 *
 * The celebration fires once per month per device and remembers that it has.
 * A popup that reappears on every page load stops being a celebration by the
 * third time and becomes something to click past.
 */
export function TeamChallengeCard({
  challenge,
  monthLabel,
  t,
}: {
  challenge: TeamChallenge;
  monthLabel: string;
  t: Dictionary["teamChallenge"];
}) {
  const storageKey = `emvolt:spa-day-celebrated:${challenge.monthStart.toISOString().slice(0, 7)}`;
  const alreadyCelebrated = useAlreadyCelebrated(storageKey);
  const [dismissed, setDismissed] = useState(false);
  const celebrating = challenge.reached && !alreadyCelebrated && !dismissed;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Nothing to do — it will simply congratulate them again next time.
    }
  }

  const pieces = CONFETTI;

  return (
    <>
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="size-4 text-primary" />
              {t.title}
            </span>
            <span className="text-xs text-muted-foreground">{monthLabel}</span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <span className="text-2xl font-semibold tabular-nums">
              {formatPoints(challenge.points)}
              <span className="text-base font-normal text-muted-foreground">
                {" / "}
                {challenge.target}
              </span>
            </span>
            <span className="text-end text-sm font-medium text-primary">{t.reward}</span>
          </div>

          <div
            className="h-3 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={challenge.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.title}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-700"
              style={{ width: `${challenge.percent}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {challenge.reached
              ? t.unlocked
              : t.toGo
                  .replace("{points}", formatPoints(challenge.pointsToTarget))
                  .replace("{reward}", t.reward)}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t.contacts}{" "}
              <bdi className="font-medium text-foreground tabular-nums">
                {challenge.breakdown.contacts}
              </bdi>
            </span>
            <span>
              {t.trials}{" "}
              <bdi className="font-medium text-foreground tabular-nums">
                {challenge.breakdown.trialsBooked}
              </bdi>
            </span>
            <span>
              {t.conversions}{" "}
              <bdi className="font-medium text-foreground tabular-nums">
                {challenge.breakdown.conversions}
              </bdi>
            </span>
          </div>
        </CardContent>
      </Card>

      {celebrating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {pieces.map((p, i) => (
              <span
                key={i}
                className="absolute top-[-10%] block animate-confetti rounded-[1px]"
                style={{
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.size * 1.6,
                  backgroundColor: p.colour,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  transform: `rotate(${p.tilt}deg)`,
                }}
              />
            ))}
          </div>

          <div className="relative flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
            <PartyPopper className="size-10 text-primary" />
            <h2 className="font-heading text-xl font-semibold">{t.celebrationTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {t.celebrationBody.replace("{reward}", t.reward)}
            </p>
            <span className="text-2xl font-semibold tabular-nums">
              {formatPoints(challenge.points)} / {challenge.target}
            </span>
            <Button onClick={dismiss} className="mt-1 w-full">
              {t.celebrationButton}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/** Half points are real, whole ones shouldn't carry a pointless ".0". */
function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}
