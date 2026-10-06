"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  good: "bg-emerald-500/10 text-emerald-400",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * A box that starts something, rather than going somewhere.
 *
 * Shaped like OverviewTile so a home screen reads as one grid, but it opens a
 * dialog in place instead of navigating. Front desk spend their day adding
 * people while someone stands at the counter, and making them find the right
 * list first and the button on it second is the long way round.
 */
export function ActionTile({
  label,
  hint,
  icon: Icon,
  tone = "primary",
  ...props
}: {
  label: string;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONE;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex min-h-24 flex-col justify-between gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-start transition-colors hover:border-ring hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        props.className
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{label}</span>
        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </div>
    </button>
  );
}
