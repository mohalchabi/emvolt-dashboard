"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PhoneOff, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logContactAttempt } from "@/lib/actions/leads";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import type { Dictionary } from "@/lib/i18n";

/**
 * Logging the two commonest outcomes without opening the lead.
 *
 * Most of a calling session is "no answer" and "interested, later". Making
 * those a round trip through the lead page is what turns five calls into five
 * calls and two logged, and an unlogged call may as well not have happened as
 * far as anything that reads these records is concerned.
 *
 * Booking a trial and writing someone off are not here on purpose: one needs a
 * date and a trainer, the other needs a reason, and neither belongs behind a
 * single tap in a list.
 */
export function QuickLogButtons({
  leadId,
  method,
  t,
}: {
  leadId: string;
  /** Whichever way they reached this lead — matches the full form's choice. */
  method: "call" | "whatsapp";
  t: Dictionary["myLeadsPage"];
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();

  function log(outcome: "no_answer" | "interested_later") {
    startTransition(async () => {
      try {
        await logContactAttempt({ leadId, method, outcome });
        setDone(outcome);
        router.refresh();
        toast.success(outcome === "no_answer" ? t.quickNoAnswerDone : t.quickLaterDone);
      } catch (err) {
        toast.error(friendlyErrorMessage(err, t.quickFailed));
      }
    });
  }

  if (done) {
    return (
      <span className="text-xs text-muted-foreground">
        {done === "no_answer" ? t.quickNoAnswerDone : t.quickLaterDone}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => log("no_answer")}
        className="h-7 px-2 text-xs"
      >
        <PhoneOff className="size-3.5" />
        {t.quickNoAnswer}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => log("interested_later")}
        className="h-7 px-2 text-xs"
      >
        <Clock3 className="size-3.5" />
        {t.quickLater}
      </Button>
    </span>
  );
}

/**
 * The nudge at the top of the list: how far off the daily five they are.
 * Dismissable for the day, because a banner that cannot be closed is a banner
 * people learn to look past.
 */
export function DailyLeadNudge({
  reachedToday,
  target,
  t,
}: {
  reachedToday: number;
  target: number;
  t: Dictionary["myLeadsPage"];
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden || reachedToday >= target) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
      <span>
        {t.nudge
          .replace("{done}", String(reachedToday))
          .replace("{target}", String(target))}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setHidden(true)}
        aria-label={t.nudgeDismiss}
        className="h-7 px-2"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
