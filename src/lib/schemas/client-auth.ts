import { z } from "zod";
import { normalizeSaudiPhone } from "@/lib/phone";

// Both steps normalize identically: requestOtp sends the code to whatever this
// produces, and verifyOtp looks the pending code up by it, so any divergence
// between the two would strand the customer on a code that can't be checked.
const phoneField = z
  .string()
  .trim()
  .min(6)
  .transform((raw, ctx) => {
    const normalized = normalizeSaudiPhone(raw);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Saudi mobile number, e.g. +966501234567." });
      return z.NEVER;
    }
    return normalized;
  });

export const requestOtpSchema = z.object({
  phone: phoneField,
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: phoneField,
  code: z.string().trim().length(6),
  clientId: z.string().optional(), // set when the caller already picked an account from the multi-match list
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
