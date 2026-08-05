"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import type { ZodType } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { PETTY_CASH_CATEGORY } from "@/lib/constants";
import {
  walletDepositSchema,
  walletTransactionSchema,
  pettyCashExpenseSchema,
} from "@/lib/schemas/wallet";
import { parseDateOnly } from "@/lib/wallet";

// Everything in the wallet has to be backed by a document — a bank transfer
// slip for money in and out, the supplier's VAT invoice for a petty-cash
// purchase — so every create path here demands at least one file. The cap is
// the whole submission, not the individual file, because the upload rides
// inside the Server Action's request body.
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

type WalletEntryKind = "deposit" | "transaction" | "petty_cash_expense";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// Zod's own message is a serialised issue array, which would land in a toast
// verbatim. Surface the first issue's message instead.
function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Check the form and try again.");
  }
  return result.data;
}

function readReceipts(formData: FormData): File[] {
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    throw new Error("Attach the bank transfer or invoice (PDF or photo).");
  }
  for (const file of files) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      throw new Error(`"${file.name}" isn't a PDF or an image.`);
    }
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_UPLOAD_BYTES) {
    throw new Error("Those files add up to more than 4.5 MB — upload them in smaller batches.");
  }
  return files;
}

async function uploadReceipts(folder: string, files: File[], uploadedById: string) {
  return Promise.all(
    files.map(async (file, index) => {
      // Blob keys are unique per upload: two files picked in one go share a
      // timestamp, and put() rejects rather than overwrites on a collision.
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const blob = await put(`wallet/${folder}/${Date.now()}-${index}-${safeName}`, file, {
        access: "private",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return { fileUrl: blob.url, fileName: file.name, uploadedById };
    })
  );
}

function revalidateWallet() {
  revalidatePath("/wallet");
  revalidatePath("/wallet/petty-cash");
}

export async function recordWalletDeposit(formData: FormData) {
  const session = await requireRole(["admin"]);

  const data = parseOrThrow(walletDepositSchema, {
    amount: text(formData, "amount"),
    receivedAt: text(formData, "receivedAt"),
    receivedFrom: text(formData, "receivedFrom"),
    reference: text(formData, "reference"),
    note: text(formData, "note"),
  });
  const files = readReceipts(formData);
  const attachments = await uploadReceipts("deposits", files, session.user.id);

  const deposit = await prisma.walletDeposit.create({
    data: {
      amount: data.amount,
      receivedAt: parseDateOnly(data.receivedAt),
      receivedFrom: data.receivedFrom,
      reference: data.reference,
      note: data.note,
      recordedById: session.user.id,
      attachments: { create: attachments },
    },
  });

  revalidateWallet();
  return deposit;
}

export async function recordWalletTransaction(formData: FormData) {
  const session = await requireRole(["admin"]);

  const data = parseOrThrow(walletTransactionSchema, {
    amount: text(formData, "amount"),
    paidAt: text(formData, "paidAt"),
    category: text(formData, "category"),
    payeeStaffId: text(formData, "payeeStaffId"),
    payeeName: text(formData, "payeeName"),
    note: text(formData, "note"),
  });

  if (data.payeeStaffId) {
    const payee = await prisma.staff.findUnique({ where: { id: data.payeeStaffId } });
    if (!payee) throw new Error("That staff member no longer exists.");
  }

  const files = readReceipts(formData);
  const attachments = await uploadReceipts("payments", files, session.user.id);

  const transaction = await prisma.walletTransaction.create({
    data: {
      amount: data.amount,
      paidAt: parseDateOnly(data.paidAt),
      category: data.category,
      // A named staff payee is the record of who was paid; the free-text name
      // is only kept for payees who aren't on staff.
      payeeStaffId: data.payeeStaffId,
      payeeName: data.payeeStaffId ? null : data.payeeName,
      note: data.note,
      recordedById: session.user.id,
      attachments: { create: attachments },
    },
  });

  revalidateWallet();
  return transaction;
}

export async function recordPettyCashExpense(formData: FormData) {
  const session = await requireRole(["admin"]);

  const data = parseOrThrow(pettyCashExpenseSchema, {
    issueId: text(formData, "issueId"),
    amount: text(formData, "amount"),
    vatAmount: text(formData, "vatAmount"),
    vendor: text(formData, "vendor"),
    vatNumber: text(formData, "vatNumber"),
    description: text(formData, "description"),
    spentAt: text(formData, "spentAt"),
  });

  const issue = await prisma.walletTransaction.findUnique({ where: { id: data.issueId } });
  if (!issue || issue.category !== PETTY_CASH_CATEGORY) {
    throw new Error("That petty cash float no longer exists.");
  }

  const files = readReceipts(formData);
  const attachments = await uploadReceipts(`petty-cash/${issue.id}`, files, session.user.id);

  const expense = await prisma.pettyCashExpense.create({
    data: {
      issueId: issue.id,
      amount: data.amount,
      vatAmount: data.vatAmount,
      vendor: data.vendor,
      vatNumber: data.vatNumber,
      description: data.description,
      spentAt: parseDateOnly(data.spentAt),
      recordedById: session.user.id,
      attachments: { create: attachments },
    },
  });

  revalidateWallet();
  return expense;
}

/** Attach more paperwork to an entry that already exists. */
export async function addWalletReceipts(formData: FormData) {
  const session = await requireRole(["admin"]);

  const kind = text(formData, "kind") as WalletEntryKind;
  const entryId = text(formData, "entryId");
  if (!entryId) throw new Error("Missing entry.");

  const folder =
    kind === "deposit" ? "deposits" : kind === "transaction" ? "payments" : "petty-cash";
  const files = readReceipts(formData);
  const uploaded = await uploadReceipts(`${folder}/${entryId}`, files, session.user.id);

  const link =
    kind === "deposit"
      ? { depositId: entryId }
      : kind === "transaction"
        ? { transactionId: entryId }
        : kind === "petty_cash_expense"
          ? { pettyCashExpenseId: entryId }
          : null;
  if (!link) throw new Error("Unknown entry type.");

  await prisma.walletAttachment.createMany({
    data: uploaded.map((attachment) => ({ ...attachment, ...link })),
  });

  revalidateWallet();
}

export async function deleteWalletAttachment(input: { attachmentId: string }) {
  await requireRole(["admin"]);

  const attachment = await prisma.walletAttachment.findUnique({
    where: { id: input.attachmentId },
  });
  if (!attachment) return;

  // Entries are required to carry proof, so the last document can't be pulled
  // off one — delete the whole entry instead.
  const siblings = await prisma.walletAttachment.count({
    where: {
      depositId: attachment.depositId,
      transactionId: attachment.transactionId,
      pettyCashExpenseId: attachment.pettyCashExpenseId,
    },
  });
  if (siblings <= 1) {
    throw new Error("This is the only document on the entry. Delete the entry itself instead.");
  }

  await del(attachment.fileUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
  await prisma.walletAttachment.delete({ where: { id: attachment.id } });

  revalidateWallet();
}

// Blobs aren't covered by the database's cascade, so each delete collects the
// files it's about to orphan — including those on petty-cash expenses that
// hang off the float being removed — and clears them first.
async function deleteBlobs(urls: string[]) {
  if (urls.length === 0) return;
  await del(urls, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

export async function deleteWalletDeposit(input: { depositId: string }) {
  await requireRole(["admin"]);

  const deposit = await prisma.walletDeposit.findUnique({
    where: { id: input.depositId },
    include: { attachments: true },
  });
  if (!deposit) return;

  await deleteBlobs(deposit.attachments.map((a) => a.fileUrl));
  await prisma.walletDeposit.delete({ where: { id: deposit.id } });

  revalidateWallet();
}

export async function deleteWalletTransaction(input: { transactionId: string }) {
  await requireRole(["admin"]);

  const transaction = await prisma.walletTransaction.findUnique({
    where: { id: input.transactionId },
    include: {
      attachments: true,
      pettyCashSpend: { include: { attachments: true } },
    },
  });
  if (!transaction) return;

  await deleteBlobs([
    ...transaction.attachments.map((a) => a.fileUrl),
    ...transaction.pettyCashSpend.flatMap((expense) =>
      expense.attachments.map((a) => a.fileUrl)
    ),
  ]);
  await prisma.walletTransaction.delete({ where: { id: transaction.id } });

  revalidateWallet();
}

export async function deletePettyCashExpense(input: { expenseId: string }) {
  await requireRole(["admin"]);

  const expense = await prisma.pettyCashExpense.findUnique({
    where: { id: input.expenseId },
    include: { attachments: true },
  });
  if (!expense) return;

  await deleteBlobs(expense.attachments.map((a) => a.fileUrl));
  await prisma.pettyCashExpense.delete({ where: { id: expense.id } });

  revalidateWallet();
}
