import { TIME_SLOTS, TOTAL_SLOTS, rowRangeForSession } from "@/lib/calendar";
import { label } from "@/lib/constants";
import { SessionBlock } from "@/components/calendar/session-block";
import type { Staff, Session, Lead, Client } from "@/generated/prisma/client";

type SessionWithRefs = Session & { lead: Lead | null; client: Client | null };

export function DayGrid({
  trainers,
  sessions,
}: {
  trainers: Staff[];
  sessions: SessionWithRefs[];
}) {
  const columns = trainers.length;

  if (columns === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
        No trainers match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <div
        className="grid min-w-fit"
        style={{
          gridTemplateColumns: `4rem repeat(${columns}, minmax(150px, 1fr))`,
          gridTemplateRows: `2.5rem repeat(${TOTAL_SLOTS}, 2rem)`,
        }}
      >
        <div className="sticky top-0 left-0 z-20 border-b border-border bg-card" style={{ gridColumn: 1, gridRow: 1 }} />
        {trainers.map((trainer, ci) => (
          <div
            key={trainer.id}
            className="sticky top-0 z-10 flex flex-col items-center justify-center border-b border-l border-border bg-card px-2 py-1"
            style={{ gridColumn: ci + 2, gridRow: 1 }}
          >
            <span className="truncate text-sm font-medium">{trainer.name}</span>
            {trainer.section && (
              <span className="text-[10px] text-muted-foreground">{label(trainer.section)}</span>
            )}
          </div>
        ))}

        {TIME_SLOTS.map((slot) => (
          <div
            key={`time-${slot.index}`}
            className="sticky left-0 z-10 border-t border-border bg-background px-2 text-right text-[10px] text-muted-foreground"
            style={{ gridColumn: 1, gridRow: slot.index + 2 }}
          >
            {slot.isHour ? slot.label : ""}
          </div>
        ))}

        {trainers.map((trainer, ci) =>
          TIME_SLOTS.map((slot) => (
            <div
              key={`cell-${trainer.id}-${slot.index}`}
              className={`border-l border-border ${slot.isHour ? "border-t" : "border-t border-dashed border-border/50"}`}
              style={{ gridColumn: ci + 2, gridRow: slot.index + 2 }}
            />
          ))
        )}

        {trainers.map((trainer, ci) =>
          sessions
            .filter((s) => s.trainerId === trainer.id)
            .map((s) => {
              const { gridRowStart, gridRowEnd } = rowRangeForSession(s.datetime, s.duration);
              return (
                <div
                  key={s.id}
                  className="px-0.5 py-px"
                  style={{ gridColumn: ci + 2, gridRow: `${gridRowStart} / ${gridRowEnd}` }}
                >
                  <SessionBlock session={s} />
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
