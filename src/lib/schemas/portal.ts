import { z } from "zod";
import { TRAINING_TYPES } from "@/lib/constants";

export const bookSessionSchema = z.object({
  packageId: z.string(),
  type: z.enum(TRAINING_TYPES),
  datetime: z.string(), // ISO string, local wall-clock time chosen by the client
});
export type BookSessionInput = z.infer<typeof bookSessionSchema>;

export const rescheduleSessionSchema = z.object({
  sessionId: z.string(),
  datetime: z.string(),
});
export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>;

export const cancelSessionSchema = z.object({
  sessionId: z.string(),
});
export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;
