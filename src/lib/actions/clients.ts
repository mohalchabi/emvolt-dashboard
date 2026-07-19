"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { label } from "@/lib/constants";
import { addNoteSchema } from "@/lib/schemas/lead";
import { packageBalances } from "@/lib/package-balance";
import { isSlotAvailable, DEFAULT_SESSION_DURATION } from "@/lib/portal-availability";
import {
  createClientSchema,
  updateClientStatusSchema,
  assignTrainerSchema,
  createPackageSchema,
  bookClientSessionSchema,
  type CreateClientInput,
  type CreatePackageInput,
  type BookClientSessionInput,
} from "@/lib/schemas/client";

export async function createClient(input: CreateClientInput) {
  const session = await requireSession();
  const data = createClientSchema.parse(input);

  const client = await prisma.client.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      section: data.section,
      assignedTrainerId: data.assignedTrainerId || null,
    },
  });

  await prisma.activityLog.create({
    data: { clientId: client.id, authorId: session.user.id, text: "Client created manually." },
  });

  revalidatePath("/clients");
  return client;
}

export async function updateClientStatus(input: { clientId: string; status: string }) {
  const session = await requireSession();
  const data = updateClientStatusSchema.parse(input);

  const client = await prisma.client.update({
    where: { id: data.clientId },
    data: { status: data.status },
  });

  await prisma.activityLog.create({
    data: {
      clientId: client.id,
      authorId: session.user.id,
      text: `Status changed to ${label(client.status)}.`,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${data.clientId}`);
}

export async function assignTrainer(input: { clientId: string; assignedTrainerId: string | null }) {
  const session = await requireSession();
  const data = assignTrainerSchema.parse(input);

  const trainer = data.assignedTrainerId
    ? await prisma.staff.findUnique({ where: { id: data.assignedTrainerId } })
    : null;

  await prisma.client.update({
    where: { id: data.clientId },
    data: { assignedTrainerId: data.assignedTrainerId },
  });

  await prisma.activityLog.create({
    data: {
      clientId: data.clientId,
      authorId: session.user.id,
      text: trainer ? `Reassigned to ${trainer.name}.` : "Trainer unassigned.",
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${data.clientId}`);
}

export async function addClientNote(input: { clientId: string; text: string }) {
  const session = await requireSession();
  const data = addNoteSchema.parse(input);
  if (!data.clientId) throw new Error("clientId is required");

  await prisma.activityLog.create({
    data: { clientId: data.clientId, authorId: session.user.id, text: data.text },
  });

  revalidatePath(`/clients/${data.clientId}`);
}

export async function createPackage(input: CreatePackageInput) {
  const session = await requireSession();
  const data = createPackageSchema.parse(input);

  const template = data.templateId
    ? await prisma.packageTemplate.findUnique({ where: { id: data.templateId } })
    : null;

  if (template && template.price !== data.price && !data.priceOverrideReason?.trim()) {
    throw new Error("A reason is required when the price differs from the package type's listed price.");
  }

  const purchaseDate = new Date();
  const expiryDate = data.expiryDate
    ? new Date(data.expiryDate)
    : template
      ? new Date(purchaseDate.getTime() + template.durationDays * 24 * 60 * 60 * 1000)
      : null;

  const pkg = await prisma.package.create({
    data: {
      clientId: data.clientId,
      templateId: template?.id ?? null,
      name: data.name,
      totalSessions: data.totalSessions,
      price: data.price,
      priceOverrideReason: template && template.price !== data.price ? data.priceOverrideReason?.trim() : null,
      purchaseDate,
      expiryDate,
    },
  });

  const priceNote =
    pkg.priceOverrideReason ? ` at ${pkg.price} SAR (${pkg.priceOverrideReason})` : "";
  await prisma.activityLog.create({
    data: {
      clientId: data.clientId,
      authorId: session.user.id,
      text: `Purchased ${data.name} (${data.totalSessions} sessions)${priceNote}.`,
    },
  });

  // A new package addresses any open "please renew me" request the client
  // made from the portal — clear it so the staff-side badge doesn't linger.
  await prisma.package.updateMany({
    where: { clientId: data.clientId, renewalRequestedAt: { not: null } },
    data: { renewalRequestedAt: null },
  });

  revalidatePath(`/clients/${data.clientId}`);
  revalidatePath("/clients");
  return pkg;
}

export async function bookClientSession(input: BookClientSessionInput) {
  const session = await requireSession();
  const data = bookClientSessionSchema.parse(input);

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) throw new Error("Could not find that client.");

  const canManage = session.user.role === "admin" || session.user.role === "front_desk";
  const isOwnTrainer = session.user.role === "trainer" && client.assignedTrainerId === session.user.id;
  if (!canManage && !isOwnTrainer) throw new Error("You don't have access to book for this client.");

  if (!client.assignedTrainerId) throw new Error("Assign a trainer to this client before booking a session.");

  const pkg = await prisma.package.findUnique({ where: { id: data.packageId } });
  if (!pkg || pkg.clientId !== client.id) throw new Error("Could not find that package.");
  if (pkg.expiryDate && pkg.expiryDate < new Date()) throw new Error("That package has expired.");

  const balance = (await packageBalances([pkg])).get(pkg.id);
  if (!balance || balance.remaining <= 0) {
    throw new Error("That package has no sessions remaining.");
  }

  const datetime = new Date(data.datetime);
  if (Number.isNaN(datetime.getTime()) || datetime <= new Date()) {
    throw new Error("Pick a time in the future.");
  }

  const available = await isSlotAvailable(client.assignedTrainerId, datetime);
  if (!available) throw new Error("That trainer already has a session at that time — pick another slot.");

  const newSession = await prisma.session.create({
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

  await prisma.activityLog.create({
    data: {
      clientId: client.id,
      authorId: session.user.id,
      text: `Booked ${label(data.type)} session for ${datetime.toLocaleString()}.`,
    },
  });

  revalidatePath(`/clients/${client.id}`);
  revalidatePath("/clients");
  revalidatePath("/my-clients");
  revalidatePath("/calendar");
  return newSession;
}

export async function sendStaffMessage(input: { clientId: string; text: string }) {
  const session = await requireSession();
  const text = input.text.trim();
  if (!text) return;

  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) throw new Error("Could not find that client.");

  const canMessage =
    session.user.role === "admin" ||
    (session.user.role === "trainer" && client.assignedTrainerId === session.user.id);
  if (!canMessage) throw new Error("You don't have access to message this client.");

  await prisma.message.create({
    data: { clientId: input.clientId, authorIsClient: false, authorStaffId: session.user.id, text },
  });

  revalidatePath(`/clients/${input.clientId}`);
}
