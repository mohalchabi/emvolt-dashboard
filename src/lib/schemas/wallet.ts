import { z } from "zod";
import {
  WALLET_CATEGORIES,
  WALLET_PAYMENT_METHODS,
  PETTY_CASH_CATEGORY,
} from "@/lib/constants";

// Wallet forms carry file uploads, so they submit as FormData and every field
// arrives as a string (see src/lib/actions/wallet.ts). These schemas take that
// raw shape and normalise it: blank optional fields become null rather than "".

const optionalText = (max = 300) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((value) => (value.length > 0 ? value : null));

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), "Pick a real date");

const money = z.coerce
  .number()
  .refine((value) => Number.isFinite(value), "Enter an amount")
  .refine((value) => value > 0, "Amount has to be more than 0");

const optionalMoney = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? Number(value) : null))
  .refine((value) => value === null || (Number.isFinite(value) && value >= 0), "Enter a valid amount");

export const walletDepositSchema = z.object({
  amount: money,
  receivedAt: dateOnly,
  receivedFrom: optionalText(120),
  reference: optionalText(120),
  note: optionalText(),
});
export type WalletDepositInput = z.infer<typeof walletDepositSchema>;

export const walletTransactionSchema = z
  .object({
    amount: money,
    paidAt: dateOnly,
    category: z.enum(WALLET_CATEGORIES),
    method: z.enum(WALLET_PAYMENT_METHODS),
    payeeStaffId: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : null)),
    payeeName: optionalText(120),
    note: optionalText(),
  })
  .refine((value) => value.payeeStaffId !== null || value.payeeName !== null, {
    message: "Say who this was paid to",
    path: ["payeeName"],
  })
  // Petty cash is reconciled per person — a float with no holder could never
  // be matched against the invoices that come back for it.
  .refine((value) => value.category !== PETTY_CASH_CATEGORY || value.payeeStaffId !== null, {
    message: "Petty cash has to be issued to a staff member",
    path: ["payeeStaffId"],
  });
export type WalletTransactionInput = z.infer<typeof walletTransactionSchema>;

export const pettyCashExpenseSchema = z
  .object({
    issueId: z.string().min(1, "Pick the petty cash float this was spent from"),
    amount: money,
    vatAmount: optionalMoney,
    vendor: z.string().trim().min(2, "Where was it bought?").max(120),
    vatNumber: optionalText(60),
    description: optionalText(),
    spentAt: dateOnly,
  })
  .refine((value) => value.vatAmount === null || value.vatAmount <= value.amount, {
    message: "VAT can't be more than the total on the invoice",
    path: ["vatAmount"],
  });
export type PettyCashExpenseInput = z.infer<typeof pettyCashExpenseSchema>;
