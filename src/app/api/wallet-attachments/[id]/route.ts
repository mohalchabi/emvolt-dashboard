import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

// Wallet paperwork is bank slips and invoices, so the blobs are private and
// only ever reach the browser through here. The role is re-checked on every
// request rather than trusted from the page that rendered the link — 404
// rather than 403 so the route doesn't confirm an id exists to non-admins.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (session?.user?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const attachment = await prisma.walletAttachment.findUnique({ where: { id } });
  if (!attachment) return new NextResponse("Not found", { status: 404 });

  const blob = await get(attachment.fileUrl, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!blob || blob.statusCode !== 200) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Content-Disposition": `inline; filename="${attachment.fileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
