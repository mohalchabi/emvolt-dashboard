import { z } from "zod";
import { SECTIONS, CLIENT_STATUSES } from "@/lib/constants";

export const createClientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(6, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  section: z.enum(SECTIONS),
  assignedTrainerId: z.string().optional().nullable(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientStatusSchema = z.object({
  clientId: z.string(),
  status: z.enum(CLIENT_STATUSES),
});

export const assignTrainerSchema = z.object({
  clientId: z.string(),
  assignedTrainerId: z.string().nullable(),
});

export const createPackageSchema = z.object({
  clientId: z.string(),
  name: z.string().min(2, "Package name is required"),
  totalSessions: z.coerce.number().int().min(1, "Must be at least 1 session"),
  price: z.coerce.number().min(0, "Price can't be negative"),
  expiryDate: z.string().optional().nullable(),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;
