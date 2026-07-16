import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

// cal.com signs the raw request body with HMAC-SHA256 using the webhook
// secret configured on the event type / webhook subscription.
function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const gotBuf = Buffer.from(signature);
  if (expectedBuf.length !== gotBuf.length) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}

// EmVolt's cal.com event types aren't wired up yet, so section isn't a
// structured field on the booking. Only set it on explicit evidence in the
// title — guessing a default here is worse than leaving it for staff to set
// during first contact (this is a segregated-section studio).
function inferSection(title: string | undefined): "male" | "female" | null {
  const t = (title ?? "").toLowerCase();
  if (t.includes("female") || t.includes("women")) return "female";
  if (t.includes("male") || t.includes("men")) return "male";
  return null;
}

// Automated activity-log entries need a Staff author; attribute them to the
// first active admin rather than adding a nullable/"system" author column.
async function getSystemAuthorId() {
  const admin = await prisma.staff.findFirst({ where: { role: "admin", active: true } });
  if (!admin) throw new Error("No active admin found to attribute webhook activity to.");
  return admin.id;
}

type CalcomPayload = {
  uid?: string;
  rescheduleUid?: string;
  title?: string;
  startTime?: string;
  eventType?: { title?: string };
  attendees?: { name?: string; email?: string; phone?: string; smsReminderNumber?: string }[];
};

export async function POST(req: NextRequest) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  const rawBody = await req.text();

  // Signature verification is skipped only when no secret is configured yet
  // (local mocked testing before the owner supplies real cal.com credentials).
  if (secret) {
    const signature = req.headers.get("x-cal-signature-256");
    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: { triggerEvent?: string; payload?: CalcomPayload };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { triggerEvent, payload } = body;
  const uid = payload?.uid;
  if (!triggerEvent || !uid) {
    return NextResponse.json({ error: "Missing triggerEvent or payload.uid" }, { status: 400 });
  }

  switch (triggerEvent) {
    case "BOOKING_CREATED": {
      const existing = await prisma.lead.findUnique({ where: { calcomBookingUid: uid } });
      if (existing) {
        return NextResponse.json({ ok: true, dedup: true, leadId: existing.id });
      }

      const attendee = payload?.attendees?.[0];
      const lead = await prisma.lead.create({
        data: {
          name: attendee?.name ?? "Unknown (cal.com)",
          phone: attendee?.phone ?? attendee?.smsReminderNumber ?? "unknown",
          source: "cal_com",
          interestedIn: "ems",
          section: inferSection(payload?.eventType?.title ?? payload?.title),
          status: "new",
          calcomBookingUid: uid,
        },
      });

      await prisma.activityLog.create({
        data: {
          leadId: lead.id,
          authorId: await getSystemAuthorId(),
          text: `Lead created from cal.com booking (${payload?.title ?? "free trial"}).`,
        },
      });

      return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
    }

    case "BOOKING_RESCHEDULED": {
      const oldUid = payload?.rescheduleUid ?? uid;
      const lead = await prisma.lead.findUnique({ where: { calcomBookingUid: oldUid } });
      if (!lead) return NextResponse.json({ ok: true, matched: false });

      await prisma.lead.update({ where: { id: lead.id }, data: { calcomBookingUid: uid } });
      await prisma.activityLog.create({
        data: {
          leadId: lead.id,
          authorId: await getSystemAuthorId(),
          text: `cal.com booking rescheduled${
            payload?.startTime ? ` to ${new Date(payload.startTime).toLocaleString()}` : ""
          }.`,
        },
      });
      return NextResponse.json({ ok: true, leadId: lead.id });
    }

    case "BOOKING_CANCELLED": {
      const lead = await prisma.lead.findUnique({ where: { calcomBookingUid: uid } });
      if (!lead) return NextResponse.json({ ok: true, matched: false });

      await prisma.activityLog.create({
        data: {
          leadId: lead.id,
          authorId: await getSystemAuthorId(),
          text: "cal.com booking cancelled.",
        },
      });
      return NextResponse.json({ ok: true, leadId: lead.id });
    }

    default:
      return NextResponse.json({ ok: true, ignored: triggerEvent });
  }
}
