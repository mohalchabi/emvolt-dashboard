"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";

const MAX_FILE_BYTES = 4.5 * 1024 * 1024; // server-upload limit

export async function uploadInBodyResult(formData: FormData) {
  const session = await requireSession();

  const clientId = formData.get("clientId");
  const takenAt = formData.get("takenAt");
  const file = formData.get("file");

  if (typeof clientId !== "string" || !clientId) throw new Error("clientId is required");
  if (typeof takenAt !== "string" || !takenAt) throw new Error("Scan date is required");
  if (!(file instanceof File) || file.size === 0) throw new Error("A file is required");
  if (file.size > MAX_FILE_BYTES) throw new Error("File is too large (max 4.5 MB).");

  const blob = await put(`inbody/${clientId}/${Date.now()}-${file.name}`, file, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const result = await prisma.inBodyResult.create({
    data: {
      clientId,
      fileUrl: blob.url,
      fileName: file.name,
      takenAt: new Date(takenAt),
      uploadedById: session.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      clientId,
      authorId: session.user.id,
      text: `Uploaded InBody result from ${new Date(takenAt).toLocaleDateString()}.`,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return result;
}

export async function deleteInBodyResult(input: { resultId: string; clientId: string }) {
  await requireSession();

  const result = await prisma.inBodyResult.findUnique({ where: { id: input.resultId } });
  if (!result) return;

  await del(result.fileUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
  await prisma.inBodyResult.delete({ where: { id: input.resultId } });

  revalidatePath(`/clients/${input.clientId}`);
}
