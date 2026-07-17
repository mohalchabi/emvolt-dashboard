"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireClientSession } from "@/lib/client-auth";
import { getSystemAuthorId } from "@/lib/system-author";
import { packageBalances } from "@/lib/package-balance";
import { isSlotAvailable, getAvailableSlots, DEFAULT_SESSION_DURATION } from "@/lib/portal-availability";
import { label } from "@/lib/constants";
import {
  bookSessionSchema,
  rescheduleSessionSchema,
  cancelSessionSchema,
  type BookSessionInput,
  type RescheduleSessionInput,
  type CancelSessionInput,
} from "@/lib/schemas/portal";

const CANCEL_RESCHEDULE_NOTICE_HOURS = 4;

function revalidatePortalAndStaff(clientId: string) {
  revalidatePath("/portal/classes");
  revalidatePath("/portal");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/calendar");
}

export async function bookSession(input: BookSessionInput) {
  const { client } = await requireClientSession();
  const data = bookSessionSchema.parse(input);

  if (!client.assignedTrainerId) {
    throw new Error("You don't have a trainer assigned yet — please contact the studio to book.");
  }

  const pkg = await prisma.package.findUnique({ where: { id: data.packageId } });
  if (!pkg || pkg.clientId !== client.id) throw new Error("Could not find that package.");
  if (pkg.expiryDate && pkg.expiryDate < new Date()) throw new Error("That package has expired.");

  const balance = (await packageBalances([pkg])).get(pkg.id);
  if (!balance || balance.remaining <= 0) {
    throw new Error("That package has no sessions remaining — request a renewal instead.");
  }

  const datetime = new Date(data.datetime);
  if (datetime <= new Date()) throw new Error("Pick a time in the future.");

  const available = await isSlotAvailable(client.assignedTrainerId, datetime);
  if (!available) throw new Error("That time was just taken — pick another slot.");

  const session = await prisma.session.create({
    data: {
      trainerId: client.assignedTrainerId,
      clientId: client.id,
      packageId: pkg.id,
      type: data.type,
      datetime,
      duration: DEFAULT_SESSION_DURATION,
      status: "scheduled",
    },
  });

  const typeLabel = label(data.type);
  const article = /^[aeiou]/i.test(typeLabel) ? "an" : "a";
  await prisma.activityLog.create({
    data: {
      clientId: client.id,
      authorId: await getSystemAuthorId(),
      text: `(Client) Booked ${article} ${typeLabel} session for ${datetime.toLocaleString()}.`,
    },
  });

  revalidatePortalAndStaff(client.id);
  return session;
}

export async function cancelSession(input: CancelSessionInput) {
  const { client } = await requireClientSession();
  const data = cancelSessionSchema.parse(input);

  const session = await prisma.session.findUnique({ where: { id: data.sessionId } });
  if (!session || session.clientId !== client.id) throw new Error("Could not find that session.");
  if (session.status !== "scheduled") throw new Error("That session can't be cancelled.");

  const hoursUntil = (session.datetime.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < CANCEL_RESCHEDULE_NOTICE_HOURS) {
    throw new Error(
      `Sessions can only be cancelled at least ${CANCEL_RESCHEDULE_NOTICE_HOURS} hours ahead — please contact the studio.`
    );
  }

  await prisma.session.update({ where: { id: session.id }, data: { status: "cancelled" } });

  await prisma.activityLog.create({
    data: {
      clientId: client.id,
      authorId: await getSystemAuthorId(),
      text: `(Client) Cancelled their ${label(session.type)} session (was ${session.datetime.toLocaleString()}).`,
    },
  });

  revalidatePortalAndStaff(client.id);
}

export async function rescheduleSession(input: RescheduleSessionInput) {
  const { client } = await requireClientSession();
  const data = rescheduleSessionSchema.parse(input);

  const session = await prisma.session.findUnique({ where: { id: data.sessionId } });
  if (!session || session.clientId !== client.id) throw new Error("Could not find that session.");
  if (session.status !== "scheduled") throw new Error("That session can't be rescheduled.");

  const hoursUntil = (session.datetime.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < CANCEL_RESCHEDULE_NOTICE_HOURS) {
    throw new Error(
      `Sessions can only be moved at least ${CANCEL_RESCHEDULE_NOTICE_HOURS} hours ahead — please contact the studio.`
    );
  }

  const newDatetime = new Date(data.datetime);
  if (newDatetime <= new Date()) throw new Error("Pick a time in the future.");

  const available = await isSlotAvailable(session.trainerId, newDatetime, session.id);
  if (!available) throw new Error("That time was just taken — pick another slot.");

  const oldDatetime = session.datetime;
  await prisma.session.update({ where: { id: session.id }, data: { datetime: newDatetime } });

  await prisma.activityLog.create({
    data: {
      clientId: client.id,
      authorId: await getSystemAuthorId(),
      text: `(Client) Moved their ${label(session.type)} session from ${oldDatetime.toLocaleString()} to ${newDatetime.toLocaleString()}.`,
    },
  });

  revalidatePortalAndStaff(client.id);
}

export async function getSlotsForClientTrainer(dateStr: string) {
  const { client } = await requireClientSession();
  if (!client.assignedTrainerId) return [];

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return [];

  const slots = await getAvailableSlots(client.assignedTrainerId, date);
  return slots.map((s) => s.toISOString());
}
