import { z } from "zod";
import { CONTACT_METHODS, CONTACT_OUTCOMES, LOST_REASONS } from "@/lib/constants";

export const logContactAttemptSchema = z.object({
  leadId: z.string(),
  method: z.enum(CONTACT_METHODS),
  outcome: z.enum(CONTACT_OUTCOMES),
  notes: z.string().optional(),
  lostReason: z.enum(LOST_REASONS).optional().nullable(),
  trialDatetime: z.string().optional(),
  trialTrainerId: z.string().optional(),
});
export type LogContactAttemptInput = z.infer<typeof logContactAttemptSchema>;
