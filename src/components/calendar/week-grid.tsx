import { addDays, isSameDay, isToday } from "date-fns";
import { label } from "@/lib/constants";
import { SessionBlock } from "@/components/calendar/session-block";
import type { Staff, Session, Lead, Client } from "@/generated/prisma/client";

type SessionWithRefs = Session & { lead: Lead | null; client: Client | null };

export function WeekGrid({
  trainers,
  sessions,
  weekStart,
}: {
  trainers: Staff[];
  sessions: SessionWithRefs[];
  weekStart: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (trainers.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
        No trainers match the current filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {trainers.map((trainer) => {
        const trainerSessions = sessions
          .filter((s) => s.trainerId === trainer.id)
          .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

        return (
          <div key={trainer.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex flex-col items-center border-b border-border pb-2">
              <span className="text-sm font-medium">{trainer.name}</span>
              {trainer.section && (
                <span className="text-[10px] text-muted-foreground">{label(trainer.section)}</span>
              )}
            </div>

            {days.map((day) => {
              const daySessions = trainerSessions.filter((s) => isSameDay(s.datetime, day));
              return (
                <div key={day.toISOString()} className="flex flex-col gap-1">
                  <div
                    className={`text-xs font-medium ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {day.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  {daySessions.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground/60">—</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {daySessions.map((s) => (
                        <div key={s.id} className="flex items-center gap-1.5">
                          <span className="w-12 shrink-0 text-[11px] text-muted-foreground">
                            {s.datetime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <div className="min-w-0 flex-1">
                            <SessionBlock session={s} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
