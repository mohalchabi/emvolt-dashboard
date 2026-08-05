"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { label } from "@/lib/constants";

const MAX_FILE_BYTES = 4.5 * 1024 * 1024; // server-upload limit
const DOCUMENT_TYPES = ["contract", "id_document"] as const;
export type ClientDocumentType = (typeof DOCUMENT_TYPES)[number];

export async function uploadClientDocument(formData: FormData) {
  const session = await requireSession();

  const clientId = formData.get("clientId");
  const type = formData.get("type");
  const file = formData.get("file");

  if (typeof clientId !== "string" || !clientId) throw new Error("clientId is required");
  if (typeof type !== "string" || !DOCUMENT_TYPES.includes(type as ClientDocumentType)) {
    throw new Error("A valid document type is required");
  }
  if (!(file instanceof File) || file.size === 0) throw new Error("A file is required");
  if (file.size > MAX_FILE_BYTES) throw new Error("File is too large (max 4.5 MB).");

  const blob = await put(`documents/${clientId}/${type}/${Date.now()}-${file.name}`, file, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const result = await prisma.clientDocument.create({
    data: {
      clientId,
      type,
      fileUrl: blob.url,
      fileName: file.name,
      uploadedById: session.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      clientId,
      authorId: session.user.id,
      text: `Uploaded ${label(type)}.`,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return result;
}

export async function deleteClientDocument(input: { documentId: string; clientId: string }) {
  await requireSession();

  const doc = await prisma.clientDocument.findUnique({ where: { id: input.documentId } });
  if (!doc) return;

  await del(doc.fileUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
  await prisma.clientDocument.delete({ where: { id: input.documentId } });

  revalidatePath(`/clients/${input.clientId}`);
}

export async function updateClientIdNumber(input: { clientId: string; idNumber: string }) {
  const session = await requireSession();
  const idNumber = input.idNumber.trim();

  await prisma.client.update({
    where: { id: input.clientId },
    data: { idNumber: idNumber || null },
  });

  await prisma.activityLog.create({
    data: {
      clientId: input.clientId,
      authorId: session.user.id,
      text: idNumber ? `Updated ID number.` : "Cleared ID number.",
    },
  });

  revalidatePath(`/clients/${input.clientId}`);
}
