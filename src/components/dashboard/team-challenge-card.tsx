"use client";

import { useState, useSyncExternalStore } from "react";
import { Zap, PartyPopper, Check, Gift, PhoneCall, CalendarCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
 * Built as a run of three stages rather than one bar, because one bar hid the
 * thing that matters: the points come from three different activities worth
 * wildly different amounts, and two of them carry a floor the points alone
 * can't clear. Each stage shows its own ring, so a trainer can see at a glance
 * which one is holding the voucher up.
 *
 * The bar underneath is stacked by where the points actually came from, which
 * makes the lopsidedness visible — all the messaging in a month is a sliver
 * next to a single sign-up, and that is exactly the lesson.
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

  const { breakdown } = challenge;
  // Past the target the segments should still fill the track rather than
  // overflow it, so the run is measured against whichever is larger.
  const denominator = Math.max(challenge.points, challenge.target, 1);
  const share = (points: number) => (points / denominator) * 100;

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card",
          challenge.reached && "border-emerald-500/50 from-emerald-500/15"
        )}
      >
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium">
              <Zap className="size-4 fill-primary text-primary" />
              {t.title}
            </span>
            <span className="text-xs text-muted-foreground">{monthLabel}</span>
          </div>

          {/* Score on one side, the prize on the other, with the run between. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-baseline gap-1.5">
              <bdi className="font-heading text-3xl font-semibold tabular-nums">
                {formatPoints(challenge.points)}
              </bdi>
              <span className="text-sm text-muted-foreground">
                / {challenge.target} {t.pointsLabel}
              </span>
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                challenge.reached
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-muted/50 text-muted-foreground"
              )}
            >
              <Gift className={cn("size-3.5", challenge.reached && "animate-bounce")} />
              {t.reward}
            </span>
          </div>

          {/* Stacked by source, so a sliver of messaging next to a block of
              sign-ups tells the story without a word of explanation. */}
          <div className="flex items-center gap-2">
            <div
              className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={challenge.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t.title}
            >
              <Segment width={share(breakdown.contactPoints)} className="bg-sky-500" />
              <Segment width={share(breakdown.trialPoints)} className="bg-cyan-400" />
              <Segment width={share(breakdown.conversionPoints)} className="bg-emerald-500" />
            </div>
            <Trophy
              className={cn(
                "size-4 shrink-0 transition-colors",
                challenge.reached ? "text-amber-400" : "text-muted-foreground/40"
              )}
            />
          </div>

          <p
            className={cn(
              "text-xs",
              challenge.reached
                ? "font-medium text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            {statusLine(challenge, t)}
          </p>

          {/* The three stages. Contacts has a ceiling rather than a floor, so
              it is measured against the cap; the other two against what the
              voucher actually demands. */}
          <div className="grid grid-cols-3 gap-2">
            <Stage
              icon={<PhoneCall className="size-3.5" />}
              label={t.contacts}
              done={breakdown.contacts}
              value={breakdown.contactPoints}
              max={challenge.contactPointsCap}
              tone="stroke-sky-500"
              capped={breakdown.contactPointsWithheld > 0}
              points={breakdown.contactPoints}
              t={t}
            />
            <Stage
              icon={<CalendarCheck className="size-3.5" />}
              label={t.trials}
              done={breakdown.trialsBooked}
              need={challenge.minTrials}
              value={breakdown.trialsBooked}
              max={challenge.minTrials}
              tone="stroke-cyan-400"
              points={breakdown.trialPoints}
              t={t}
            />
            <Stage
              icon={<Trophy className="size-3.5" />}
              label={t.conversions}
              done={breakdown.conversions}
              need={challenge.minConversions}
              value={breakdown.conversions}
              max={challenge.minConversions}
              tone="stroke-emerald-500"
              points={breakdown.conversionPoints}
              t={t}
            />
          </div>

          {breakdown.contactPointsWithheld > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t.contactCapReached.replace("{cap}", formatPoints(challenge.contactPointsCap))}
            </p>
          )}
        </CardContent>
      </Card>

      {celebrating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CONFETTI.map((p, i) => (
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

/** One source's slice of the track. Hidden entirely at zero so no seam shows. */
function Segment({ width, className }: { width: number; className: string }) {
  if (width <= 0) return null;
  return (
    <div
      className={cn("h-full transition-[width] duration-700 first:rounded-s-full", className)}
      style={{ width: `${width}%` }}
    />
  );
}

/**
 * One of the three stages: a ring, the count, and what it is worth so far.
 *
 * Counts are shown as "7 / 14" rather than a percentage — these are small
 * whole numbers of real people, and a trainer reading "50%" learns less than
 * one reading that seven more will do it.
 */
function Stage({
  icon,
  label,
  done,
  need,
  value,
  max,
  tone,
  points,
  capped,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  done: number;
  /** The floor this stage has to clear, when it has one. */
  need?: number;
  value: number;
  max: number;
  tone: string;
  points: number;
  capped?: boolean;
  t: Dictionary["teamChallenge"];
}) {
  const met = need === undefined ? Boolean(capped) : done >= need;

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
      <Ring value={value} max={max} tone={tone}>
        {met ? (
          <Check className="size-4 text-emerald-500" />
        ) : (
          <span className="text-muted-foreground">{icon}</span>
        )}
      </Ring>
      <bdi className="text-sm font-semibold tabular-nums">
        {need === undefined ? done : `${done} / ${need}`}
      </bdi>
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
      <bdi className="text-[11px] tabular-nums text-muted-foreground/80">
        {t.worthPoints.replace("{points}", formatPoints(points))}
      </bdi>
    </div>
  );
}

/** A progress ring with whatever belongs in the middle of it. */
function Ring({
  value,
  max,
  tone,
  children,
}: {
  value: number;
  max: number;
  tone: string;
  children: React.ReactNode;
}) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const filled = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <span className="relative inline-flex size-12 items-center justify-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-12 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          className="stroke-border"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={cn(tone, "transition-[stroke-dashoffset] duration-700")}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
        />
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

/**
 * What to say under the run. There are three states, not two: the points can
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
