import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  good: "bg-emerald-500/10 text-emerald-400",
  warning: "bg-amber-500/10 text-amber-400",
  critical: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function StatTile({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          {/* An amount must never break across lines: "4,200.00 / SAR" reads as
              two figures. Whether it wrapped used to depend on which digits it
              contained, since "4" is wider than "1" — tabular-nums removes that,
              and nowrap removes the rest. */}
          <div
            className={cn(
              "font-semibold",
              typeof value === "string" && value.length > 9
                ? "text-lg tabular-nums whitespace-nowrap"
                : "text-2xl"
            )}
          >
            {value}
          </div>
          <div className="truncate text-xs text-muted-foreground">{label}</div>
          {sublabel && <div className="truncate text-xs text-muted-foreground">{sublabel}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
