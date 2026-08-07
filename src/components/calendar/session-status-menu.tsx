"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SESSION_STATUSES, label } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n";
import { updateSessionStatus } from "@/lib/actions/sessions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  completed: "default",
  cancelled: "outline",
  no_show: "destructive",
};

/**
 * The session's status, as a badge you can click to change. Rendered wherever
 * a session is listed so attendance gets recorded where staff already are,
 * rather than on a separate screen they'd have to remember to visit.
 */
export function SessionStatusMenu({
  sessionId,
  status,
  locale = "en",
  t,
}: {
  sessionId: string;
  status: string;
  locale?: "en" | "ar";
  t?: Dictionary["clientDetail"];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSelect(next: string) {
    if (next === status) return;
    startTransition(async () => {
      try {
        await updateSessionStatus({ sessionId, status: next });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update the session.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={isPending}
            className="shrink-0 disabled:opacity-50"
            aria-label={t?.changeStatus ?? "Change session status"}
          />
        }
      >
        <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="gap-1 cursor-pointer">
          {label(status, locale)}
          <ChevronDown className="size-3 opacity-70" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SESSION_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onClick={() => onSelect(s)}>
            {label(s, locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
