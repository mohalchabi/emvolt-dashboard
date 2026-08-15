"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import type { ZodType } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, requireSession } from "@/lib/auth-helpers";
import { PETTY_CASH_CATEGORY } from "@/lib/constants";
import {
  walletDepositSchema,
  walletTransactionSchema,
  pettyCashExpenseSchema,
} from "@/lib/schemas/wallet";
import { parseDateOnly } from "@/lib/wallet";

// Entries can carry documents — a bank transfer slip for money in and out,
// the supplier's VAT invoice for a petty-cash purchase — but none of them are
// required: an entry with no paperwork still belongs in the ledger, and the
// files can always be attached later. The cap is the whole submission, not the
// individual file, because the upload rides inside the Server Action's
// request body.
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
  // The holder's own view reads the same rows, so anything filed from either
  // side has to invalidate both or the two screens disagree about what's left.
  revalidatePath("/my-petty-cash");
}

/** The float an expense is being filed against, or a message saying it's gone. */
async function loadPettyCashFloat(issueId: string) {
  const issue = await prisma.walletTransaction.findUnique({ where: { id: issueId } });
  if (!issue || issue.category !== PETTY_CASH_CATEGORY) {
    throw new Error("That petty cash float no longer exists.");
  }
  return issue;
}

/**
 * Everything after "is this person allowed to file against this float".
 * Authorization deliberately stays in the callers: widening the holder's path
 * can then never quietly widen the admin's, or the other way round.
 */
async function savePettyCashExpense({
  formData,
  issueId,
  recordedById,
  spentById,
  requireInvoice,
}: {
  formData: FormData;
  issueId: string;
  recordedById: string;
  /** Who made the purchase, as opposed to who is keying it in. */
  spentById: string | null;
  /** Holders must photograph the bill; admins can key one in and attach later. */
  requireInvoice: boolean;
}) {
  const data = parseOrThrow(pettyCashExpenseSchema, {
    issueId,
    amount: text(formData, "amount"),
    vatAmount: text(formData, "vatAmount"),
    vendor: text(formData, "vendor"),
    vatNumber: text(formData, "vatNumber"),
    description: text(formData, "description"),
    spentAt: text(formData, "spentAt"),
  });

  const files = readReceipts(formData);
  if (requireInvoice && files.length === 0) {
    throw new Error("Attach a photo or a PDF of the invoice.");
  }
  const attachments = await uploadReceipts(`petty-cash/${issueId}`, files, recordedById);

  const expense = await prisma.pettyCashExpense.create({
    data: {
      issueId,
      amount: data.amount,
      vatAmount: data.vatAmount,
      vendor: data.vendor,
      vatNumber: data.vatNumber,
      description: data.description,
      spentAt: parseDateOnly(data.spentAt),
      recordedById,
      spentById,
      attachments: { create: attachments },
    },
  });

  revalidateWallet();
  return expense;
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
    method: text(formData, "method"),
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
      method: data.method,
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
  const issue = await loadPettyCashFloat(text(formData, "issueId"));

  // The admin is transcribing someone else's receipt, so the purchase belongs
  // to the float's holder unless they say a colleague actually made it.
  const spentById = text(formData, "spentById") || issue.payeeStaffId;

  return savePettyCashExpense({
    formData,
    issueId: issue.id,
    recordedById: session.user.id,
    spentById,
    requireInvoice: false,
  });
}

/**
 * The same thing, filed by the person actually carrying the float rather than
 * by an admin transcribing their receipts afterwards.
 *
 * Any signed-in staff member may call this, but only against a float issued to
 * them — the float is re-read from the database and its holder compared to the
 * session, so a guessed `issueId` from someone else's float is rejected rather
 * than trusted from the form. The invoice is mandatory here: the whole point of
 * pushing this to the holder is that they have the bill in their hand.
 */
export async function recordOwnPettyCashExpense(formData: FormData) {
  const session = await requireSession();
  const issue = await loadPettyCashFloat(text(formData, "issueId"));

  if (issue.payeeStaffId !== session.user.id) {
    throw new Error("That petty cash float isn't yours.");
  }

  // Filing your own purchase, so there is nobody else it could belong to.
  return savePettyCashExpense({
    formData,
    issueId: issue.id,
    recordedById: session.user.id,
    spentById: session.user.id,
    requireInvoice: true,
  });
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
  // Uploading nothing is a no-op everywhere else, but here it's the whole
  // point of the form, so it's worth saying so.
  if (files.length === 0) throw new Error("Choose a PDF or photo to upload.");
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
