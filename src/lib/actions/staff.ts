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
export async function deleteStaff(input: { staffId: string }) {
  const session = await requireRole(["admin"]);
  const data = deleteStaffSchema.parse(input);

  if (data.staffId === session.user.id) {
    throw new Error("You can't delete your own account.");
  }

  const [leads, clients, sessions, slots, logs, attempts, inbody, messages] = await Promise.all([
    prisma.lead.count({ where: { assignedStaffId: data.staffId } }),
    prisma.client.count({ where: { assignedTrainerId: data.staffId } }),
    prisma.session.count({ where: { trainerId: data.staffId } }),
    prisma.recurringSlot.count({ where: { trainerId: data.staffId } }),
    prisma.activityLog.count({ where: { authorId: data.staffId } }),
    prisma.leadContactAttempt.count({ where: { staffId: data.staffId } }),
    prisma.inBodyResult.count({ where: { uploadedById: data.staffId } }),
    prisma.message.count({ where: { authorStaffId: data.staffId } }),
  ]);
  const hasHistory = [leads, clients, sessions, slots, logs, attempts, inbody, messages].some((n) => n > 0);
  if (hasHistory) {
    throw new Error(
      "This staff member has existing leads, clients, sessions, or activity — deactivate them instead of deleting."
    );
  }

  await prisma.staff.delete({ where: { id: data.staffId } });

  revalidatePath("/staff");
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
