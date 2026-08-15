import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

const notFound = () => new NextResponse("Not found", { status: 404 });

// Wallet paperwork is bank slips and invoices, so the blobs are private and
// only ever reach the browser through here. Access is re-checked on every
// request rather than trusted from the page that rendered the link — 404
// rather than 403 so the route doesn't confirm an id exists to someone who
// isn't allowed it.
//
// Admins see all of it. Everyone else sees exactly one thing: invoices filed
// against a petty-cash float issued to them, so a trainer can reopen a bill
// they photographed without the rest of the ledger coming with it. Note the
// float's own document is deliberately not covered — that's the admin's
// handover paperwork, not the holder's.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) return notFound();

  const attachment = await prisma.walletAttachment.findUnique({
    where: { id },
    include: {
      pettyCashExpense: { select: { issue: { select: { payeeStaffId: true } } } },
    },
  });
  if (!attachment) return notFound();

  const holdsTheFloat =
    attachment.pettyCashExpense?.issue.payeeStaffId === session.user.id;
  if (session.user.role !== "admin" && !holdsTheFloat) return notFound();

  const blob = await get(attachment.fileUrl, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!blob || blob.statusCode !== 200) return notFound();

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Content-Disposition": `inline; filename="${attachment.fileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
