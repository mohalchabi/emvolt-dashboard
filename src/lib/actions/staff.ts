"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import {
  createStaffSchema,
  updateStaffRoleSchema,
  updateStaffSectionSchema,
  updateStaffPhoneSchema,
  updateStaffDetailsSchema,
  deleteStaffSchema,
  setStaffActiveSchema,
  type CreateStaffInput,
  type UpdateStaffDetailsInput,
} from "@/lib/schemas/staff";

export async function createStaff(input: CreateStaffInput) {
  await requireRole(["admin"]);
  const data = createStaffSchema.parse(input);

  const staff = await prisma.staff.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      role: data.role,
      section: data.role === "trainer" ? data.section ?? null : null,
    },
  });

  revalidatePath("/staff");
  return staff;
}

export async function updateStaffPhone(input: { staffId: string; phone: string | null }) {
  await requireRole(["admin"]);
  const data = updateStaffPhoneSchema.parse(input);

  await prisma.staff.update({ where: { id: data.staffId }, data: { phone: data.phone || null } });

  revalidatePath("/staff");
}

export async function updateStaffRole(input: { staffId: string; role: string }) {
  await requireRole(["admin"]);
  const data = updateStaffRoleSchema.parse(input);

  await prisma.staff.update({
    where: { id: data.staffId },
    data: { role: data.role, section: data.role === "trainer" ? undefined : null },
  });

  revalidatePath("/staff");
}

export async function updateStaffSection(input: { staffId: string; section: string | null }) {
  await requireRole(["admin"]);
  const data = updateStaffSectionSchema.parse(input);

  await prisma.staff.update({ where: { id: data.staffId }, data: { section: data.section } });

  revalidatePath("/staff");
}

export async function updateStaffTarget(input: { staffId: string; leadTarget: number | null }) {
  await requireRole(["admin"]);

  await prisma.staff.update({
    where: { id: input.staffId },
    data: { leadTarget: input.leadTarget },
  });

  revalidatePath("/staff");
  revalidatePath("/");
}

export async function updateStaffDetails(input: UpdateStaffDetailsInput) {
  await requireRole(["admin"]);
  const data = updateStaffDetailsSchema.parse(input);

  await prisma.staff.update({
    where: { id: data.staffId },
    data: { name: data.name, email: data.email.toLowerCase() },
  });

  revalidatePath("/staff");
}

// A hard delete only makes sense for a staff row that never actually did
// anything (e.g. created by mistake) — once they've got sessions, leads,
// activity logs, etc. attached, deleting them would either cascade-destroy
// real business history or violate a foreign key, neither of which an admin
// clicking "Delete" actually wants. Deactivating (which just blocks sign-in)
// is the right tool once a staff member has any real history.
/** What is still pointing at a staff member and cannot be pointed elsewhere. */
export type DeleteBlocker = { key: string; count: number };

export type DeleteStaffResult =
  | { ok: true; unassignedClients: number; unassignedLeads: number }
  | { ok: false; blockers: DeleteBlocker[] };

/**
 * Rolled back to leave the unassignment undone when the delete can't go
 * through. Thrown rather than returned so it escapes the transaction.
 */
class BlockedByHistory extends Error {
  constructor(readonly blockers: DeleteBlocker[]) {
    super("blocked");
  }
}

/**
 * Removes a staff member, handing their clients and leads back to the pool.
 *
 * Assignments are a statement about who is responsible now, so they are simply
 * cleared. Records of work already done are not: a session that happened, a
 * wallet entry, a note in a client's history all name the person who did it,
 * and there is no honest value to put there instead. Those block the delete and
 * are reported by name so the reason is obvious.
 *
 * Returns its outcome rather than throwing it, because Next.js replaces server
 * action error messages with an opaque digest in production builds — a thrown
 * explanation never reaches the admin reading it.
 */
export async function deleteStaff(input: { staffId: string }): Promise<DeleteStaffResult> {
  const session = await requireRole(["admin"]);
  const data = deleteStaffSchema.parse(input);

  if (data.staffId === session.user.id) {
    throw new Error("You can't delete your own account.");
  }

  const staffId = data.staffId;

  try {
    return await prisma.$transaction(async (tx) => {
      // Hand the people back to the pool first, so a trainer who only ever
      // held assignments deletes cleanly.
      const [{ count: unassignedClients }, { count: unassignedLeads }] = await Promise.all([
        tx.client.updateMany({
          where: { assignedTrainerId: staffId },
          data: { assignedTrainerId: null },
        }),
        tx.lead.updateMany({
          where: { assignedStaffId: staffId },
          data: { assignedStaffId: null },
        }),
      ]);

      // The rest of the nullable links are attribution rather than assignment,
      // and drop to "no longer on staff" just as cleanly.
      await Promise.all([
        tx.message.updateMany({
          where: { authorStaffId: staffId },
          data: { authorStaffId: null },
        }),
        tx.walletTransaction.updateMany({
          where: { payeeStaffId: staffId },
          data: { payeeStaffId: null },
        }),
        tx.pettyCashExpense.updateMany({ where: { spentById: staffId }, data: { spentById: null } }),
      ]);

      const counts = await Promise.all([
        tx.session.count({ where: { trainerId: staffId } }),
        tx.recurringSlot.count({ where: { trainerId: staffId } }),
        tx.activityLog.count({ where: { authorId: staffId } }),
        tx.leadContactAttempt.count({ where: { staffId } }),
        tx.inBodyResult.count({ where: { uploadedById: staffId } }),
        tx.clientDocument.count({ where: { uploadedById: staffId } }),
        tx.clockEvent.count({ where: { staffId } }),
        tx.walletDeposit.count({ where: { recordedById: staffId } }),
        tx.walletTransaction.count({ where: { recordedById: staffId } }),
        tx.pettyCashExpense.count({ where: { recordedById: staffId } }),
        tx.walletAttachment.count({ where: { uploadedById: staffId } }),
      ]);
      const keys = [
        "sessions",
        "recurringSlots",
        "activityLogs",
        "contactAttempts",
        "inBodyResults",
        "documents",
        "clockEvents",
        "walletDeposits",
        "walletTransactions",
        "pettyCashExpenses",
        "walletAttachments",
      ];
      const blockers = keys
        .map((key, i) => ({ key, count: counts[i] }))
        .filter((b) => b.count > 0);

      if (blockers.length > 0) throw new BlockedByHistory(blockers);

      await tx.staff.delete({ where: { id: staffId } });
      return { ok: true as const, unassignedClients, unassignedLeads };
    });
  } catch (err) {
    if (err instanceof BlockedByHistory) return { ok: false as const, blockers: err.blockers };
    throw err;
  } finally {
    revalidatePath("/staff");
    revalidatePath("/clients");
    revalidatePath("/leads");
  }
}

export async function setStaffActive(input: { staffId: string; active: boolean }) {
  const session = await requireRole(["admin"]);
  const data = setStaffActiveSchema.parse(input);

  if (data.staffId === session.user.id && !data.active) {
    throw new Error("You can't deactivate your own account.");
  }

  await prisma.staff.update({ where: { id: data.staffId }, data: { active: data.active } });

  revalidatePath("/staff");
}
