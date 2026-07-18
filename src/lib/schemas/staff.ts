import { z } from "zod";
import { STAFF_ROLES, SECTIONS } from "@/lib/constants";

export const createStaffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().nullable(),
  role: z.enum(STAFF_ROLES),
  section: z.enum(SECTIONS).optional().nullable(),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffPhoneSchema = z.object({
  staffId: z.string(),
  phone: z.string().nullable(),
});

export const updateStaffRoleSchema = z.object({
  staffId: z.string(),
  role: z.enum(STAFF_ROLES),
});

export const updateStaffSectionSchema = z.object({
  staffId: z.string(),
  section: z.enum(SECTIONS).nullable(),
});

export const setStaffActiveSchema = z.object({
  staffId: z.string(),
  active: z.boolean(),
});

export const updateStaffDetailsSchema = z.object({
  staffId: z.string(),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
});
export type UpdateStaffDetailsInput = z.infer<typeof updateStaffDetailsSchema>;

export const deleteStaffSchema = z.object({
  staffId: z.string(),
});
