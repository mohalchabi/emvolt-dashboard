"use client";

import { useState, useSyncExternalStore } from "react";
import { Sparkles, PartyPopper, Check, Circle } from "lucide-react";
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

          <p className="text-xs text-muted-foreground">{statusLine(challenge, t)}</p>

          {/* The two things the points alone can't buy. Shown as their own
              progress so a full bar that hasn't unlocked makes sense at a
              glance, rather than looking like a fault. */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <Requirement
              label={t.trials}
              done={challenge.breakdown.trialsBooked}
              need={challenge.minTrials}
            />
            <Requirement
              label={t.conversions}
              done={challenge.breakdown.conversions}
              need={challenge.minConversions}
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t.contacts}{" "}
              <bdi className="font-medium text-foreground tabular-nums">
                {challenge.breakdown.contacts}
              </bdi>
            </span>
            {challenge.breakdown.contactPointsWithheld > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {t.contactCapReached.replace(
                  "{cap}",
                  formatPoints(challenge.contactPointsCap)
                )}
              </span>
            )}
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

/**
 * One of the two conditions, with a tick once it is met.
 *
 * The count is shown as "7 of 14" rather than as a percentage: these are
 * small whole numbers of real people, and a trainer reading "50%" learns
 * less than one reading that seven more will do it.
 */
function Requirement({
  label,
  done,
  need,
}: {
  label: string;
  done: number;
  need: number;
}) {
  const met = done >= need;

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5">
        {met ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Circle className="size-3.5 text-muted-foreground/50" />
        )}
        <span className={met ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      </span>
      <bdi
        className={`tabular-nums ${met ? "text-muted-foreground" : "font-medium text-foreground"}`}
      >
        {done} / {need}
      </bdi>
    </div>
  );
}

/**
 * What to say under the bar. There are three states, not two: the points can
 * be there while the trials or the sign-ups are not, and that case needs its
 * own sentence or the card reads as broken.
 */
function statusLine(challenge: TeamChallenge, t: Dictionary["teamChallenge"]): string {
  if (challenge.reached) return t.unlocked;

  if (challenge.pointsReached) {
    const trials = Math.max(0, challenge.minTrials - challenge.breakdown.trialsBooked);
    const sales = Math.max(0, challenge.minConversions - challenge.breakdown.conversions);
    // Name only what is actually missing: "and 0 more sign-ups" reads as a bug.
    if (trials > 0 && sales > 0) {
      return t.pointsDoneNeedBoth
        .replace("{trials}", String(trials))
        .replace("{sales}", String(sales));
    }
    if (trials > 0) return t.pointsDoneNeedTrials.replace("{trials}", String(trials));
    return t.pointsDoneNeedSales.replace("{sales}", String(sales));
  }

  return t.toGo
    .replace("{points}", formatPoints(challenge.pointsToTarget))
    .replace("{reward}", t.reward);
}

/** Half points are real, whole ones shouldn't carry a pointless ".0". */
function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}
