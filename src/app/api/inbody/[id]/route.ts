import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { getClientSession } from "@/lib/client-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await prisma.inBodyResult.findUnique({ where: { id } });
  if (!result) return new NextResponse("Not found", { status: 404 });

  // Staff can view any result (unchanged); a client may only view their own.
  const staffSession = await auth();
  if (!staffSession?.user) {
    const clientSession = await getClientSession();
    if (!clientSession || clientSession.client.id !== result.clientId) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const blob = await get(result.fileUrl, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
  if (!blob || blob.statusCode !== 200) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Content-Disposition": `inline; filename="${result.fileName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
