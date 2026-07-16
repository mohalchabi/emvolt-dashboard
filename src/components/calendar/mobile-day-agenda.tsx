import { label } from "@/lib/constants";
import { SessionBlock } from "@/components/calendar/session-block";
import type { Staff, Session, Lead, Client } from "@/generated/prisma/client";

type SessionWithRefs = Session & { lead: Lead | null; client: Client | null };

export function MobileDayAgenda({
  trainers,
  sessions,
}: {
  trainers: Staff[];
  sessions: SessionWithRefs[];
}) {
  if (trainers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No trainers match the current filters.
      </div>
    );
  }

  const trainerById = new Map(trainers.map((t) => [t.id, t]));
  const sorted = [...sessions].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  if (sorted.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No sessions scheduled.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((s) => {
        const trainer = trainerById.get(s.trainerId);
        return (
          <div key={s.id} className="flex items-center gap-2 rounded-lg border bg-card p-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              {s.datetime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            <div className="min-w-0 flex-1">
              <SessionBlock session={s} />
            </div>
            {trainer && (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {trainer.name}
                {trainer.section ? ` · ${label(trainer.section)}` : ""}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
