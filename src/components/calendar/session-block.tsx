import Link from "next/link";
import { label } from "@/lib/constants";
import type { Session, Lead, Client } from "@/generated/prisma/client";

const TYPE_STYLES: Record<string, string> = {
  trial: "border-chart-4/60 bg-chart-4/15 text-chart-4",
  ems: "border-primary/60 bg-primary/15 text-primary",
  pilates: "border-chart-3/60 bg-chart-3/15 text-chart-3",
  pt: "border-chart-5/60 bg-chart-5/15 text-chart-5",
};

type SessionWithRefs = Session & { lead: Lead | null; client: Client | null };

export function SessionBlock({ session }: { session: SessionWithRefs }) {
  const name = session.lead?.name ?? session.client?.name ?? "Unknown";
  const href = session.lead ? `/leads/${session.lead.id}` : `/clients/${session.clientId}`;
  const cancelled = session.status === "cancelled";
  const noShow = session.status === "no_show";

  return (
    <Link
      href={href}
      className={`flex flex-col overflow-hidden rounded-md border px-1.5 py-1 text-xs leading-tight transition-opacity hover:opacity-80 ${TYPE_STYLES[session.type] ?? TYPE_STYLES.ems} ${cancelled ? "opacity-40 line-through" : ""} ${noShow ? "ring-1 ring-destructive" : ""}`}
    >
      <span className="truncate font-medium">{name}</span>
      <span className="truncate opacity-80">
        {label(session.type)}
        {session.status !== "scheduled" && session.status !== "completed"
          ? ` · ${label(session.status)}`
          : ""}
      </span>
    </Link>
  );
}
