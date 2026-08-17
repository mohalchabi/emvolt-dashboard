import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  good: "bg-emerald-500/10 text-emerald-400",
  warning: "bg-amber-500/10 text-amber-400",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * One box on a staff member's home screen.
 *
 * The whole card is the link rather than a small caption inside it: these are
 * tapped on phones, often one-handed between sessions, so the target should be
 * the size of the thing you can see.
 */
export function OverviewTile({
  href,
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "primary",
}: {
  href: string;
  label: string;
  /** The one number worth seeing without opening the page. Omit when there isn't one. */
  value?: string | number;
  sublabel?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONE;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-24 flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE[tone])}>
        <Icon className="size-5" />
      </span>

      <div className="flex min-w-0 flex-col">
        {value !== undefined && (
          // On its own line rather than beside the icon: a formatted amount
          // like "SAR 1,000.00" has no room left over in a two-up tile on a
          // phone and wraps mid-number, which reads as two figures.
          <span
            className={cn(
              "truncate font-semibold leading-tight",
              typeof value === "string" && value.length > 7 ? "text-xl" : "text-2xl"
            )}
          >
            {value}
          </span>
        )}
        <span className="truncate text-sm font-medium">{label}</span>
        {sublabel && <span className="truncate text-xs text-muted-foreground">{sublabel}</span>}
      </div>
    </Link>
  );
}
