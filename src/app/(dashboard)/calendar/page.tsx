import { startOfDay, endOfDay, startOfWeek, endOfWeek, format, isValid, parseISO } from "date-fns";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { DayGrid } from "@/components/calendar/day-grid";
import { WeekGrid } from "@/components/calendar/week-grid";
import { MobileDayAgenda } from "@/components/calendar/mobile-day-agenda";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; section?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const view = params.view === "week" ? "week" : "day";
  const parsedDate = params.date ? parseISO(params.date) : new Date();
  const date = isValid(parsedDate) ? parsedDate : new Date();

  const isTrainer = session.user.role === "trainer";
  const showSectionFilter = !isTrainer;

  const trainers = await prisma.staff.findMany({
    where: isTrainer
      ? { id: session.user.id }
      : { active: true, role: "trainer", section: params.section || undefined },
    orderBy: [{ section: "asc" }, { name: "asc" }],
  });

  const rangeStart = view === "day" ? startOfDay(date) : startOfWeek(date, { weekStartsOn: 0 });
  const rangeEnd = view === "day" ? endOfDay(date) : endOfWeek(date, { weekStartsOn: 0 });

  const sessions = await prisma.session.findMany({
    where: {
      trainerId: { in: trainers.map((t) => t.id) },
      datetime: { gte: rangeStart, lte: rangeEnd },
      status: { not: "cancelled" },
    },
    include: { lead: true, client: true },
    orderBy: { datetime: "asc" },
  });

  const title =
    view === "day"
      ? format(date, "EEEE, MMMM d, yyyy")
      : `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Trials and client sessions across {isTrainer ? "your schedule" : "all trainers"}.
        </p>
      </div>

      <CalendarToolbar
        view={view}
        date={date}
        section={params.section}
        showSectionFilter={showSectionFilter}
        title={title}
      />

      {view === "day" ? (
        <>
          <div className="sm:hidden">
            <MobileDayAgenda trainers={trainers} sessions={sessions} />
          </div>
          <div className="hidden sm:block">
            <DayGrid trainers={trainers} sessions={sessions} />
          </div>
        </>
      ) : (
        <WeekGrid trainers={trainers} sessions={sessions} weekStart={rangeStart} />
      )}
    </div>
  );
}
