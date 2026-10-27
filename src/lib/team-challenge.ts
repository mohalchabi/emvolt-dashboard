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
  trialBookingRate: 0.1,
  /** Of those who come in, how many buy. */
  trialToPaidRate: 0.28,
  /**
   * How many of the modelled trials must actually be booked, on top of the
   * points total, before the reward unlocks. Set below one so an ordinary
   * month clears it; it exists to stop volume alone winning, not to make the
   * reward unreachable.
   */
  minimumTrialShare: 0.6,
} as const;

/**
 * Sales each trainer must personally be worth before the voucher unlocks,
 * set by the studio rather than modelled. A flat per-head number is the point:
 * it scales with the team and it cannot be diluted by one strong month from
 * one person carrying everyone else.
 */
export const MIN_CONVERSIONS_PER_TRAINER = 3;

export type TeamChallenge = {
  /** Points earned so far this month, after the cap on messaging. */
  points: number;
  target: number;
  /** 0–100, capped, for the bar. */
  percent: number;
  /** Every condition met: the points, the trials and the sales. */
  reached: boolean;
  /** The points total alone, before the two conditions below. */
  pointsReached: boolean;
  breakdown: {
    contacts: number;
    trialsBooked: number;
    conversions: number;
    contactPoints: number;
    /** Points the cap withheld, so the limit can be shown rather than felt. */
    contactPointsWithheld: number;
    trialPoints: number;
    conversionPoints: number;
  };
  /**
   * Reaching people is worth credit, but only so much of it. Past this, more
   * messages add nothing — the rest of the goal has to be earned by getting
   * people in and signing them up.
   */
  contactPointsCap: number;
  /** Trials that must actually be booked, regardless of the points total. */
  minTrials: number;
  /** Sales that must happen regardless of points: three per trainer. */
  minConversions: number;
  trainerCount: number;
  monthStart: Date;
  monthEnd: Date;
  /** Points still needed, once the cap is taken into account. */
  pointsToTarget: number;
};

/** What the month is modelled on, for the goal and the two minimums. */
function model(trainerCount: number) {
  const people = Math.max(1, trainerCount);
  const contacts = people * DAILY_LEAD_TARGET * ASSUMPTIONS.workingDaysPerMonth;
  const trials = contacts * ASSUMPTIONS.trialBookingRate;
  const conversions = trials * ASSUMPTIONS.trialToPaidRate;
  return { contacts, trials, conversions };
}

/**
 * The month's goal, scaled to how many people are working the list.
 *
 * Rounded to the nearest 25 so it reads as a goal rather than as the output of
 * a formula, and floored so a single trainer still has something to aim at.
 */
export function monthlyTarget(trainerCount: number): number {
  const { contacts, trials, conversions } = model(trainerCount);
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

  const modelled = model(trainerCount);
  // Doing the daily minimum every working day earns full credit for messaging.
  // Beyond that it earns nothing, so a thousand messages can't buy the reward.
  const contactPointsCap = modelled.contacts * POINTS.contact;
  const earnedOnContacts = contacts * POINTS.contact;
  const contactPoints = Math.min(earnedOnContacts, contactPointsCap);

  const trialPoints = trialsBooked * POINTS.trialBooked;
  const conversionPoints = conversions * POINTS.conversion;
  const points = contactPoints + trialPoints + conversionPoints;

  const target = monthlyTarget(trainerCount);
  const minTrials = Math.max(1, Math.round(modelled.trials * ASSUMPTIONS.minimumTrialShare));
  const minConversions = Math.max(1, trainerCount) * MIN_CONVERSIONS_PER_TRAINER;

  const pointsReached = points >= target;

  return {
    points,
    target,
    percent: Math.min(100, Math.round((points / target) * 100)),
    // All three, so the reward always means people came in and people signed up.
    reached: pointsReached && trialsBooked >= minTrials && conversions >= minConversions,
    pointsReached,
    breakdown: {
      contacts,
      trialsBooked,
      conversions,
      contactPoints,
      contactPointsWithheld: Math.max(0, earnedOnContacts - contactPoints),
      trialPoints,
      conversionPoints,
    },
    contactPointsCap,
    minTrials,
    minConversions,
    trainerCount,
    monthStart,
    monthEnd,
    pointsToTarget: Math.max(0, target - points),
  };
}
