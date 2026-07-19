import { z } from "zod";
import { SECTIONS, CLIENT_STATUSES, TRAINING_TYPES, CLIENT_SOURCES, PAYMENT_METHODS } from "@/lib/constants";

export const createClientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(6, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  section: z.enum(SECTIONS),
  assignedTrainerId: z.string().optional().nullable(),
  source: z.enum(CLIENT_SOURCES).optional().nullable(),
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
  templateId: z.string().optional().nullable(),
  name: z.string().min(2, "Package name is required"),
  totalSessions: z.coerce.number().int().min(1, "Must be at least 1 session"),
  price: z.coerce.number().min(0, "Price can't be negative"),
  // Required by the createPackage action (not enforced here) whenever price
  // differs from the selected template's listed price.
  priceOverrideReason: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

// Staff (typically a trainer) signing up a walk-in who was never a Lead —
// captures the client, how they heard about the studio, and their first
// package purchase (including payment method) in one go.
export const createWalkInClientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(6, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  section: z.enum(SECTIONS),
  source: z.enum(CLIENT_SOURCES),
  templateId: z.string().optional().nullable(),
  packageName: z.string().min(2, "Package name is required"),
  totalSessions: z.coerce.number().int().min(1, "Must be at least 1 session"),
  price: z.coerce.number().min(0, "Price can't be negative"),
  priceOverrideReason: z.string().optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS),
});
export type CreateWalkInClientInput = z.infer<typeof createWalkInClientSchema>;

export const bookClientSessionSchema = z.object({
  clientId: z.string(),
  packageId: z.string(),
  type: z.enum(TRAINING_TYPES),
  datetime: z.string().min(1, "Pick a date and time"),
});
export type BookClientSessionInput = z.infer<typeof bookClientSessionSchema>;
