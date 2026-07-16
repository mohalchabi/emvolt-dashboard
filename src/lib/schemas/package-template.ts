import { z } from "zod";

export const createPackageTemplateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  sessions: z.coerce.number().int().min(1, "Must be at least 1 session"),
  durationDays: z.coerce.number().int().min(1, "Must be at least 1 day"),
  price: z.coerce.number().min(0, "Price can't be negative"),
});
export type CreatePackageTemplateInput = z.infer<typeof createPackageTemplateSchema>;

export const updatePackageTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(2, "Name is required"),
  sessions: z.coerce.number().int().min(1, "Must be at least 1 session"),
  durationDays: z.coerce.number().int().min(1, "Must be at least 1 day"),
  price: z.coerce.number().min(0, "Price can't be negative"),
});
export type UpdatePackageTemplateInput = z.infer<typeof updatePackageTemplateSchema>;
