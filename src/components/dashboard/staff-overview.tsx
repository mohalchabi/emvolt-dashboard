import { startOfDay, endOfDay } from "date-fns";
import {
  Users2,
  CalendarClock,
  ClipboardList,
  Wallet,
  Coins,
  BookOpen,
  Package,
  UserCog,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PETTY_CASH_CATEGORY, isManagerRole, type StaffRole } from "@/lib/constants";
import { formatSar, roundMoney } from "@/lib/wallet";
import { currentClockState } from "@/lib/actions/attendance";
import { ClockCard } from "@/components/attendance/clock-card";
import { OverviewTile } from "@/components/dashboard/overview-tile";
import type { Dictionary, Locale } from "@/lib/i18n";

/** Leads that still need working — anything not yet won or written off. */
const OPEN_LEAD_STATUSES = ["new", "contacted", "trial_scheduled", "trial_completed"];

/**
 * The first thing staff see when they open the app: clock in or out, then a
 * handful of boxes for the places they actually go.
 *
 * Every role gets one. What differs is which boxes, and each box carries the
 * single number that answers "do I need to open this right now" — sessions
 * today, leads still to call, cash unaccounted for.
 */
export async function StaffOverview({
  staffId,
  role,
  t,
  locale,
}: {
  staffId: string;
  role: StaffRole;
  t: Dictionary;
  locale: Locale;
}) {
  const c = t.overview;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const isManager = isManagerRole(role);
  const isTrainer = role === "trainer";
  const isFrontDesk = role === "front_desk";

  const [clock, sessionsToday, myClients, myOpenLeads, allClients, openLeads, myFloats] =
    await Promise.all([
      currentClockState(staffId),
      prisma.session.count({
        where: {
          datetime: { gte: todayStart, lte: todayEnd },
          status: { not: "cancelled" },
          ...(isTrainer ? { trainerId: staffId } : {}),
        },
      }),
      isTrainer
        ? prisma.client.count({ where: { assignedTrainerId: staffId, status: "active" } })
        : Promise.resolve(0),
      isTrainer || isFrontDesk
        ? prisma.lead.count({ where: { assignedStaffId: staffId, status: { in: OPEN_LEAD_STATUSES } } })
        : Promise.resolve(0),
      isManager || isFrontDesk
        ? prisma.client.count({ where: { status: "active" } })
        : Promise.resolve(0),
      isManager ? prisma.lead.count({ where: { status: { in: OPEN_LEAD_STATUSES } } }) : Promise.resolve(0),
      // Petty cash only shows up for whoever is actually carrying some.
      prisma.walletTransaction.findMany({
        where: { category: PETTY_CASH_CATEGORY, payeeStaffId: staffId },
        select: { amount: true, pettyCashSpend: { select: { amount: true } } },
      }),
    ]);

  const floatRemaining = roundMoney(
    myFloats.reduce(
      (sum, f) => sum + f.amount - f.pettyCashSpend.reduce((s, e) => s + e.amount, 0),
      0
    )
  );

  return (
    <div className="flex flex-col gap-4">
      <ClockCard
        isClockedIn={clock.isClockedIn}
        sinceLabel={
          clock.isClockedIn && clock.last
            ? clock.last.at.toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null
        }
        t={t.attendance}
        locale={locale}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {isTrainer && (
          <>
            <OverviewTile href="/my-clients" label={c.myClients} value={myClients} icon={Users2} />
            <OverviewTile
              href="/calendar"
              label={c.mySchedule}
              value={sessionsToday}
              sublabel={c.today}
              icon={CalendarClock}
            />
            <OverviewTile
              href="/my-leads"
              label={c.myLeads}
              value={myOpenLeads}
              sublabel={c.stillToCall}
              icon={ClipboardList}
              tone={myOpenLeads > 0 ? "warning" : "neutral"}
            />
          </>
        )}

        {isFrontDesk && (
          <>
            <OverviewTile href="/clients" label={c.clients} value={allClients} icon={Users2} />
            <OverviewTile
              href="/my-leads"
              label={c.myLeads}
              value={myOpenLeads}
              sublabel={c.stillToCall}
              icon={ClipboardList}
              tone={myOpenLeads > 0 ? "warning" : "neutral"}
            />
            <OverviewTile
              href="/calendar"
              label={c.schedule}
              value={sessionsToday}
              sublabel={c.today}
              icon={CalendarClock}
            />
          </>
        )}

        {isManager && (
          <>
            <OverviewTile href="/clients" label={c.clients} value={allClients} icon={Users2} />
            <OverviewTile
              href="/leads"
              label={c.leads}
              value={openLeads}
              sublabel={c.stillToCall}
              icon={ClipboardList}
              tone={openLeads > 0 ? "warning" : "neutral"}
            />
            <OverviewTile
              href="/calendar"
              label={c.schedule}
              value={sessionsToday}
              sublabel={c.today}
              icon={CalendarClock}
            />
            <OverviewTile
              href={role === "admin" ? "/wallet/petty-cash" : "/wallet/petty-cash"}
              label={c.pettyCash}
              icon={Coins}
              tone="neutral"
            />
            <OverviewTile href="/package-types" label={c.packageTypes} icon={Package} tone="neutral" />
            {role === "admin" && (
              <>
                <OverviewTile href="/wallet" label={c.wallet} icon={Wallet} tone="neutral" />
                <OverviewTile href="/staff" label={c.staff} icon={UserCog} tone="neutral" />
              </>
            )}
          </>
        )}

        {/* Only for whoever is actually holding a float. */}
        {myFloats.length > 0 && (
          <OverviewTile
            href="/my-petty-cash"
            label={c.myPettyCash}
            value={formatSar(floatRemaining)}
            sublabel={c.stillOnYou}
            icon={Coins}
            tone={floatRemaining > 0 ? "warning" : "good"}
          />
        )}

        <OverviewTile href="/help" label={c.help} icon={BookOpen} tone="neutral" />
      </div>
    </div>
  );
}
