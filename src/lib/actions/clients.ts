"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { label } from "@/lib/constants";
import { addNoteSchema } from "@/lib/schemas/lead";
import {
  createClientSchema,
  updateClientStatusSchema,
  assignTrainerSchema,
  createPackageSchema,
  type CreateClientInput,
  type CreatePackageInput,
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

  const pkg = await prisma.package.create({
    data: {
      clientId: data.clientId,
      name: data.name,
      totalSessions: data.totalSessions,
      price: data.price,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    },
  });

  await prisma.activityLog.create({
    data: {
      clientId: data.clientId,
      authorId: session.user.id,
      text: `Purchased ${data.name} (${data.totalSessions} sessions).`,
    },
  });

  revalidatePath(`/clients/${data.clientId}`);
  return pkg;
}
