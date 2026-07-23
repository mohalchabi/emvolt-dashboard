"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession, requireRole } from "@/lib/auth-helpers";
import { label } from "@/lib/constants";
import {
  createLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
  updateLeadSectionSchema,
  addNoteSchema,
  sendLeadCampaignSchema,
  type CreateLeadInput,
  type SendLeadCampaignInput,
} from "@/lib/schemas/lead";
import { logContactAttemptSchema, type LogContactAttemptInput } from "@/lib/schemas/contact";
import { sendSms } from "@/lib/notify/unifonic-sms";
import { isWhatsappConfigured, sendWhatsappMessage } from "@/lib/notify/whatsapp";

// Full lead-list browsing and distribution is admin-only; everyone else may
// only act on a lead already assigned to them. This guards the server
// actions themselves — the page-level route gates are UI convenience, not
// the security boundary.
async function requireLeadAccess(leadId: string) {
  const session = await requireSession();
  if (session.user.role === "admin") return session;

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedStaffId: true } });
  if (!lead || lead.assignedStaffId !== session.user.id) {
    throw new Error("You don't have access to this lead.");
  }
  return session;
}

export async function createLead(input: CreateLeadInput) {
  const session = await requireRole(["admin"]);
  const data = createLeadSchema.parse(input);

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      phone: data.phone,
      source: data.source,
      interestedIn: data.interestedIn,
      section: data.section,
      assignedStaffId: data.assignedStaffId || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      authorId: session.user.id,
      text: `Lead created (source: ${label(data.source)}).`,
    },
  });

  revalidatePath("/leads");
  return lead;
}

export async function updateLeadStatus(input: {
  leadId: string;
  status: string;
  lostReason?: string | null;
}) {
  const data = updateLeadStatusSchema.parse(input);
  const session = await requireLeadAccess(data.leadId);

  const lead = await prisma.lead.update({
    where: { id: data.leadId },
    data: {
      status: data.status,
      lostReason: data.status === "lost" ? (data.lostReason ?? null) : null,
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      authorId: session.user.id,
      text:
        lead.status === "lost"
          ? `Status changed to Lost (${label(lead.lostReason ?? "other")}).`
          : `Status changed to ${label(lead.status)}.`,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/my-leads");
  revalidatePath(`/leads/${data.leadId}`);
}

export async function assignLead(input: { leadId: string; assignedStaffId: string | null }) {
  const session = await requireRole(["admin"]);
  const data = assignLeadSchema.parse(input);

  const staff = data.assignedStaffId
    ? await prisma.staff.findUnique({ where: { id: data.assignedStaffId } })
    : null;

  const lead = await prisma.lead.update({
    where: { id: data.leadId },
    data: { assignedStaffId: data.assignedStaffId },
  });

  await prisma.activityLog.create({
    data: {
      leadId: data.leadId,
      authorId: session.user.id,
      text: staff ? `Assigned to ${staff.name}.` : `Unassigned.`,
    },
  });

  if (staff?.phone) {
    await sendSms(
      staff.phone,
      `New lead assigned to you: ${lead.name} (${lead.phone}). Open the app to reach out.`
    ).catch((err) => console.error(`Failed to SMS ${staff.phone} about lead assignment:`, err));
  }

  revalidatePath("/leads");
  revalidatePath("/my-leads");
  revalidatePath(`/leads/${data.leadId}`);
}

export async function bulkAssignLeads(input: { leadIds: string[]; staffId: string }) {
  const session = await requireRole(["admin"]);
  if (input.leadIds.length === 0) throw new Error("No leads selected.");

  const staff = await prisma.staff.findUniqueOrThrow({ where: { id: input.staffId } });

  await prisma.$transaction([
    prisma.lead.updateMany({
      where: { id: { in: input.leadIds } },
      data: { assignedStaffId: staff.id },
    }),
    prisma.activityLog.createMany({
      data: input.leadIds.map((leadId) => ({
        leadId,
        authorId: session.user.id,
        text: `Assigned to ${staff.name}.`,
      })),
    }),
  ]);

  if (staff.phone) {
    const count = input.leadIds.length;
    await sendSms(
      staff.phone,
      `${count} new lead${count === 1 ? "" : "s"} assigned to you. Open the app to start reaching out.`
    ).catch((err) => console.error(`Failed to SMS ${staff.phone} about bulk lead assignment:`, err));
  }

  revalidatePath("/leads");
  revalidatePath("/my-leads");
  return { count: input.leadIds.length, staffName: staff.name };
}

// Marketing campaigns are admin-only, same as bulk assignment. Sends run
// sequentially and skip failures rather than aborting the whole batch — one
// bad number shouldn't block the rest of the campaign. See
// src/lib/notify/whatsapp.ts for the dev-log fallback used until a WhatsApp
// Sender is registered.
export async function sendLeadCampaign(input: SendLeadCampaignInput) {
  const session = await requireRole(["admin"]);
  const { leadIds, message } = sendLeadCampaignSchema.parse(input);

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, phone: true },
  });
  if (leads.length === 0) throw new Error("No leads selected.");

  const succeeded: string[] = [];
  for (const lead of leads) {
    try {
      await sendWhatsappMessage(lead.phone, message);
      succeeded.push(lead.id);
    } catch {
      // keep going
    }
  }

  if (succeeded.length > 0) {
    await prisma.activityLog.createMany({
      data: succeeded.map((leadId) => ({
        leadId,
        authorId: session.user.id,
        text: "(Campaign) WhatsApp marketing message sent.",
      })),
    });
  }

  revalidatePath("/leads");
  revalidatePath("/my-leads");
  return { sent: succeeded.length, failed: leads.length - succeeded.length, simulated: !isWhatsappConfigured() };
}

export async function updateLeadSection(input: { leadId: string; section: string }) {
  const data = updateLeadSectionSchema.parse(input);
  const session = await requireLeadAccess(data.leadId);

  const lead = await prisma.lead.update({
    where: { id: data.leadId },
    data: { section: data.section },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      authorId: session.user.id,
      text: `Section set to ${label(lead.section!)}.`,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/my-leads");
  revalidatePath(`/leads/${data.leadId}`);
}

export async function addLeadNote(input: { leadId: string; text: string }) {
  const data = addNoteSchema.parse(input);
  if (!data.leadId) throw new Error("leadId is required");
  const session = await requireLeadAccess(data.leadId);

  await prisma.activityLog.create({
    data: { leadId: data.leadId, authorId: session.user.id, text: data.text },
  });

  revalidatePath(`/leads/${data.leadId}`);
}

export async function convertLeadToClient(leadId: string) {
  const session = await requireLeadAccess(leadId);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (!lead.section) {
    throw new Error("Set this lead's section before converting to a client.");
  }

  const client = await prisma.client.create({
    data: {
      name: lead.name,
      phone: lead.phone,
      section: lead.section,
      assignedTrainerId: lead.assignedStaffId,
      convertedFromLeadId: lead.id,
    },
  });

  await prisma.lead.update({ where: { id: lead.id }, data: { status: "converted" } });

  await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      authorId: session.user.id,
      text: `Converted to client.`,
    },
  });
  await prisma.activityLog.create({
    data: {
      clientId: client.id,
      authorId: session.user.id,
      text: `Converted from lead.`,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/my-leads");
  revalidatePath("/clients");
  return client;
}

export async function logContactAttempt(input: LogContactAttemptInput) {
  const data = logContactAttemptSchema.parse(input);
  const session = await requireLeadAccess(data.leadId);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: data.leadId } });

  const methodLabel = label(data.method);
  let statusUpdate: { status: string; lostReason?: string | null } | null = null;
  let summary: string;

  if (data.outcome === "declined") {
    const reason = data.lostReason ?? "not_interested";
    statusUpdate = { status: "lost", lostReason: reason };
    summary = `${methodLabel} — Not interested (${label(reason)}).`;
  } else if (data.outcome === "interested_later") {
    if (lead.status === "new") statusUpdate = { status: "contacted" };
    summary = `${methodLabel} — Interested, follow up later.`;
  } else if (data.outcome === "booked_trial") {
    if (!lead.section) throw new Error("Set this lead's section before booking a trial.");
    if (!data.trialDatetime || !data.trialTrainerId) {
      throw new Error("Pick a trainer and a date/time for the trial.");
    }
    statusUpdate = { status: "trial_scheduled" };
    summary = `${methodLabel} — Booked a trial for ${new Date(data.trialDatetime).toLocaleString()}.`;
  } else {
    summary = `${methodLabel} — No answer.`;
  }

  const note = data.notes?.trim();
  if (note) summary += ` "${note}"`;

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.leadContactAttempt.create({
      data: {
        leadId: data.leadId,
        staffId: session.user.id,
        method: data.method,
        outcome: data.outcome,
        notes: note || null,
      },
    }),
  ];

  if (data.outcome === "booked_trial") {
    operations.push(
      prisma.session.create({
        data: {
          trainerId: data.trialTrainerId!,
          type: "trial",
          datetime: new Date(data.trialDatetime!),
          duration: 20,
          status: "scheduled",
          leadId: data.leadId,
        },
      })
    );
  }

  if (statusUpdate) {
    operations.push(prisma.lead.update({ where: { id: data.leadId }, data: statusUpdate }));
  }

  operations.push(
    prisma.activityLog.create({
      data: { leadId: data.leadId, authorId: session.user.id, text: summary },
    })
  );

  await prisma.$transaction(operations);

  revalidatePath("/leads");
  revalidatePath("/my-leads");
  revalidatePath(`/leads/${data.leadId}`);
  revalidatePath("/calendar");
}
