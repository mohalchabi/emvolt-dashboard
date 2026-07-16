"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import {
  createPackageTemplateSchema,
  updatePackageTemplateSchema,
  type CreatePackageTemplateInput,
  type UpdatePackageTemplateInput,
} from "@/lib/schemas/package-template";

export async function createPackageTemplate(input: CreatePackageTemplateInput) {
  await requireRole(["admin"]);
  const data = createPackageTemplateSchema.parse(input);

  const template = await prisma.packageTemplate.create({ data });

  revalidatePath("/package-types");
  return template;
}

export async function updatePackageTemplate(input: UpdatePackageTemplateInput) {
  await requireRole(["admin"]);
  const data = updatePackageTemplateSchema.parse(input);

  await prisma.packageTemplate.update({
    where: { id: data.templateId },
    data: {
      name: data.name,
      sessions: data.sessions,
      durationDays: data.durationDays,
      price: data.price,
    },
  });

  revalidatePath("/package-types");
}

export async function setPackageTemplateActive(input: { templateId: string; active: boolean }) {
  await requireRole(["admin"]);

  await prisma.packageTemplate.update({
    where: { id: input.templateId },
    data: { active: input.active },
  });

  revalidatePath("/package-types");
}
