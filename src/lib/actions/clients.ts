"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-helpers";
import { createClientSession } from "@/lib/client-auth";
import { label } from "@/lib/constants";
import { addNoteSchema } from "@/lib/schemas/lead";
import { packageBalances } from "@/lib/package-balance";
import { isSlotAvailable, overlaps, DEFAULT_SESSION_DURATION } from "@/lib/portal-availability";
import {
  createClientSchema,
  updateClientStatusSchema,
  assignTrainerSchema,
  createPackageSchema,
  bookClientSessionSchema,
  createWalkInClientSchema,
  type CreateClientInput,
  type CreatePackageInput,
  type BookClientSessionInput,
  type CreateWalkInClientInput,
} from "@/lib/schemas/client";

// Validates a batch of upfront session datetimes for one package purchase —
// none in the past, none overlapping each other, none conflicting with the
// trainer's existing schedule — and returns ready-to-insert Session data
// (still missing clientId/packageId, added by the caller).
async function prepareSessionRows({
  trainerId,
  type,
  datetimes,
}: {
  trainerId: string;
  type: string;
  datetimes: string[];
}) {
  if (datetimes.length === 0) return [];

  const parsed = datetimes.map((d) => new Date(d));
  for (const dt of parsed) {
    if (Number.isNaN(dt.getTime()) || dt <= new Date()) {
      throw new Error("Pick a time in the future for every scheduled session.");
    }
  }

  const sorted = [...parsed].sort((a, b) => a.getTime() - b.getTime());
  for (let i = 1; i < sorted.length; i++) {
    if (overlaps(sorted[i - 1], DEFAULT_SESSION_DURATION, sorted[i], DEFAULT_SESSION_DURATION)) {
      throw new Error("Two of the session times you picked overlap each other — pick different times.");
    }
  }

  for (const dt of parsed) {
    if (!(await isSlotAvailable(trainerId, dt))) {
      throw new Error(`The trainer already has a session at ${dt.toLocaleString()} — pick another time.`);
    }
  }

  return parsed.map((dt) => ({
    trainerId,
    type,
    datetime: dt,
    duration: DEFAULT_SESSION_DURATION,
    status: "scheduled" as const,
  }));
}

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
      source: data.source || null,
    },
  });

  await prisma.activityLog.create({
    data: { clientId: client.id, authorId: session.user.id, text: "Client created manually." },
  });

  revalidatePath("/clients");
  return client;
}

// Lets an admin see exactly what a given client sees in the portal — no
// phone/OTP involved, so it works regardless of whether SMS delivery is
// wired up. Sets the same session cookie a real OTP login would; it doesn't
// touch or require the admin's own staff session, which is a separate
// cookie entirely.
export async function previewAsClient(clientId: string) {
  await requireRole(["admin"]);
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  await createClientSession(client.id);
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

  const sessionDates = data.sessionDates?.filter(Boolean) ?? [];
  let sessionRows: Awaited<ReturnType<typeof prepareSessionRows>> = [];
  if (sessionDates.length > 0) {
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new Error("Could not find that client.");
    if (!client.assignedTrainerId) {
      throw new Error("Assign a trainer to this client before scheduling sessions.");
    }
    sessionRows = await prepareSessionRows({
      trainerId: client.assignedTrainerId,
      type: data.sessionType ?? "pt",
      datetimes: sessionDates,
    });
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
      paymentMethod: data.paymentMethod || null,
      isRenewal: data.isRenewal ?? false,
      purchaseDate,
      expiryDate,
    },
  });

  if (sessionRows.length > 0) {
    await prisma.session.createMany({
      data: sessionRows.map((r) => ({ ...r, clientId: data.clientId, packageId: pkg.id })),
    });
  }

  const priceNote =
    pkg.priceOverrideReason ? ` at ${pkg.price} SAR (${pkg.priceOverrideReason})` : "";
  const paymentNote = pkg.paymentMethod ? ` — paid via ${label(pkg.paymentMethod)}` : "";
  const scheduleNote = sessionRows.length > 0 ? ` — ${sessionRows.length} session(s) scheduled` : "";
  await prisma.activityLog.create({
    data: {
      clientId: data.clientId,
      authorId: session.user.id,
      // The activity feed is what staff actually read back, so the renewal
      // shows up there in words rather than only as a flag on the row.
      text: `${pkg.isRenewal ? "Renewed" : "Purchased"} ${data.name} (${data.totalSessions} sessions)${priceNote}${paymentNote}${scheduleNote}.`,
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
  if (sessionRows.length > 0) {
    revalidatePath("/my-clients");
    revalidatePath("/calendar");
  }
  return pkg;
}

// Staff signing up a walk-in who was never a Lead — creates the Client and
// their first Package (with payment method) together, atomically. A trainer
// calling this is auto-assigned as the client's trainer; anyone else leaves
// it unassigned (no trainer-picker UI is exposed to them for this action).
export async function createWalkInClient(input: CreateWalkInClientInput) {
  const session = await requireSession();
  const data = createWalkInClientSchema.parse(input);

  const template = data.templateId
    ? await prisma.packageTemplate.findUnique({ where: { id: data.templateId } })
    : null;

  if (template && template.price !== data.price && !data.priceOverrideReason?.trim()) {
    throw new Error("A reason is required when the price differs from the package type's listed price.");
  }

  const assignedTrainerId = session.user.role === "trainer" ? session.user.id : null;
  const purchaseDate = new Date();
  const expiryDate = template ? new Date(purchaseDate.getTime() + template.durationDays * 24 * 60 * 60 * 1000) : null;

  const sessionDates = data.sessionDates?.filter(Boolean) ?? [];
  let sessionRows: Awaited<ReturnType<typeof prepareSessionRows>> = [];
  if (sessionDates.length > 0) {
    if (!assignedTrainerId) {
      throw new Error("Only a trainer signing the client up under themselves can schedule sessions here.");
    }
    sessionRows = await prepareSessionRows({
      trainerId: assignedTrainerId,
      type: data.sessionType ?? "pt",
      datetimes: sessionDates,
    });
  }

  const client = await prisma.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        section: data.section,
        source: data.source,
        assignedTrainerId,
      },
    });

    const pkg = await tx.package.create({
      data: {
        clientId: newClient.id,
        templateId: template?.id ?? null,
        name: data.packageName,
        totalSessions: data.totalSessions,
        price: data.price,
        priceOverrideReason: template && template.price !== data.price ? data.priceOverrideReason?.trim() : null,
        paymentMethod: data.paymentMethod,
        purchaseDate,
        expiryDate,
      },
    });

    await tx.activityLog.create({
      data: { clientId: newClient.id, authorId: session.user.id, text: `Client added (walk-in, via ${label(data.source)}).` },
    });

    if (sessionRows.length > 0) {
      await tx.session.createMany({
        data: sessionRows.map((r) => ({ ...r, clientId: newClient.id, packageId: pkg.id })),
      });
    }

    const priceNote = pkg.priceOverrideReason ? ` at ${pkg.price} SAR (${pkg.priceOverrideReason})` : "";
    const scheduleNote = sessionRows.length > 0 ? ` — ${sessionRows.length} session(s) scheduled` : "";
    await tx.activityLog.create({
      data: {
        clientId: newClient.id,
        authorId: session.user.id,
        text: `Purchased ${pkg.name} (${pkg.totalSessions} sessions)${priceNote} — paid via ${label(data.paymentMethod)}${scheduleNote}.`,
      },
    });

    return newClient;
  });

  revalidatePath("/clients");
  revalidatePath("/my-clients");
  revalidatePath(`/clients/${client.id}`);
  if (sessionRows.length > 0) {
    revalidatePath("/calendar");
  }
  return client;
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
