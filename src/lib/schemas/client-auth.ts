import { z } from "zod";

export const requestOtpSchema = z.object({
  phone: z.string().trim().min(6),
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: z.string().trim().min(6),
  code: z.string().trim().length(6),
  clientId: z.string().optional(), // set when the caller already picked an account from the multi-match list
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
