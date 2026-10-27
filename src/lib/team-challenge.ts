import { prisma } from "@/lib/db";
import { DAILY_LEAD_TARGET } from "@/lib/constants";
import { startOfGymMonth, endOfGymMonth } from "@/lib/time";

/**
 * A shared score the trainers build together over a month.
 *
 * Nothing is stored. The score is worked out from the records that already
 * exist — contact attempts, trials booked, packages sold to people who came
 * in as leads — every time it is read. A stored counter would drift the
 * moment anything was corrected, and a score nobody trusts motivates nobody.
 *
 * It is deliberately a team total rather than a league table. Two trainers
 * ranked against each other compete for the same leads; two trainers pushing
 * one number work the list between them.
 */
export const POINTS = {
  /** Reaching a lead at all, by call or by message. */
  contact: 0.5,
  /** Getting them through the door for a free trial. */
  trialBooked: 3,
  /** The trial becoming a paid package. */
  conversion: 50,
} as const;

/**
 * What the month's goal is built from.
 *
 * These are assumptions, not measurements — the studio has no history of
 * worked leads to measure yet, which is the problem the challenge exists to
 * fix. They are here, named and in one place, so they can be moved once there
 * is a real month to look at.
 *
 * The rates are deliberately modest. These are cold leads that have been
 * sitting unworked, not fresh enquiries, and a goal nobody can reach is worse
 * than no goal.
 */
const ASSUMPTIONS = {
  workingDaysPerMonth: 24,
  /** Of the leads reached, how many agree to come in. */
  trialBookingRate: 0.12,
  /** Of those who come in, how many buy. */
  trialToPaidRate: 0.3,
} as const;

export type TeamChallenge = {
  /** Points earned so far this month. */
  points: number;
  target: number;
  /** 0–100, capped, for the bar. */
  percent: number;
  reached: boolean;
  breakdown: {
    contacts: number;
    trialsBooked: number;
    conversions: number;
    contactPoints: number;
    trialPoints: number;
    conversionPoints: number;
  };
  trainerCount: number;
  monthStart: Date;
  monthEnd: Date;
  /** What the next point would come from, for the nudge on the dashboard. */
  pointsToTarget: number;
};

/**
 * The month's goal, scaled to how many people are working the list.
 *
 * Rounded to the nearest 25 so it reads as a goal rather than as the output of
 * a formula, and floored so a single trainer still has something to aim at.
 */
export function monthlyTarget(trainerCount: number): number {
  const people = Math.max(1, trainerCount);
  const contacts = people * DAILY_LEAD_TARGET * ASSUMPTIONS.workingDaysPerMonth;
  const trials = contacts * ASSUMPTIONS.trialBookingRate;
  const conversions = trials * ASSUMPTIONS.trialToPaidRate;

  const raw =
    contacts * POINTS.contact + trials * POINTS.trialBooked + conversions * POINTS.conversion;

  return Math.max(250, Math.round(raw / 25) * 25);
}

export async function getTeamChallenge(now: Date = new Date()): Promise<TeamChallenge> {
  const monthStart = startOfGymMonth(now);
  const monthEnd = endOfGymMonth(now);
  const window = { gte: monthStart, lte: monthEnd };

  const [trainerCount, contacts, trialsBooked, conversions] = await Promise.all([
    prisma.staff.count({ where: { active: true, role: "trainer" } }),
    prisma.leadContactAttempt.count({ where: { createdAt: window } }),
    prisma.leadContactAttempt.count({ where: { createdAt: window, outcome: "booked_trial" } }),
    // A package sold to someone who arrived as a lead. Renewals are excluded:
    // the fifty points are for winning someone over, and a client renewing was
    // already won.
    prisma.package.count({
      where: {
        purchaseDate: window,
        isRenewal: false,
        client: { convertedFromLeadId: { not: null } },
      },
    }),
  ]);

  const contactPoints = contacts * POINTS.contact;
  const trialPoints = trialsBooked * POINTS.trialBooked;
  const conversionPoints = conversions * POINTS.conversion;
  const points = contactPoints + trialPoints + conversionPoints;
  const target = monthlyTarget(trainerCount);

  return {
    points,
    target,
    percent: Math.min(100, Math.round((points / target) * 100)),
    reached: points >= target,
    breakdown: {
      contacts,
      trialsBooked,
      conversions,
      contactPoints,
      trialPoints,
      conversionPoints,
    },
    trainerCount,
    monthStart,
    monthEnd,
    pointsToTarget: Math.max(0, target - points),
  };
}
