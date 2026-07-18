"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import {
  createStaffSchema,
  updateStaffRoleSchema,
  updateStaffSectionSchema,
  updateStaffPhoneSchema,
  setStaffActiveSchema,
  type CreateStaffInput,
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

export async function setStaffActive(input: { staffId: string; active: boolean }) {
  const session = await requireRole(["admin"]);
  const data = setStaffActiveSchema.parse(input);

  if (data.staffId === session.user.id && !data.active) {
    throw new Error("You can't deactivate your own account.");
  }

  await prisma.staff.update({ where: { id: data.staffId }, data: { active: data.active } });

  revalidatePath("/staff");
}
