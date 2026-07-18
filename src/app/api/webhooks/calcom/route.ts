import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { getSystemAuthorId } from "@/lib/system-author";
import { sendSms } from "@/lib/notify/twilio-sms";

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

// EmVolt runs one shared cal.com booking link for everyone (not a link per
// trainer), so which section a booking is for isn't implicit in the event
// type — it has to come from a custom booking question the event type asks
// every attendee (e.g. "Which session are you booking? Male / Female").
// cal.com puts custom-question answers in `payload.responses` (v2 shape) or
// `payload.customInputs` (legacy); we don't depend on a specific field name,
// just scan every answer for an explicit "male"/"female" value. Title text is
// still checked as a fallback for any event type that encodes it there
// instead. No match just means a human sets it during first contact, same as
// before.
function inferSection(payload: CalcomPayload): "male" | "female" | null {
  const answers: unknown[] = [
    ...Object.values(payload.responses ?? {}).map((r) => r?.value),
    ...(payload.customInputs ?? []).map((c) => c?.value),
  ];
  for (const answer of answers) {
    if (typeof answer !== "string") continue;
    const v = answer.trim().toLowerCase();
    if (v === "female" || v === "women") return "female";
    if (v === "male" || v === "men") return "male";
  }

  const t = (payload.title ?? payload.eventType?.title ?? "").toLowerCase();
  if (t.includes("female") || t.includes("women")) return "female";
  if (t.includes("male") || t.includes("men")) return "male";
  return null;
}

// Auto-assigning only makes sense when there's exactly one active trainer in
// that section — otherwise which of them gets it is a real judgment call a
// human should make, not something to guess at. This also means the rule
// keeps working correctly on its own as the roster changes (e.g. today there
// are two female trainers so female bookings stay unassigned for manual
// pick, but if that ever drops to one, auto-assignment kicks in for them too
// without any code change).
async function resolveAutoAssignedTrainer(section: "male" | "female" | null) {
  if (!section) return null;
  const trainers = await prisma.staff.findMany({
    where: { role: "trainer", section, active: true },
  });
  return trainers.length === 1 ? trainers[0] : null;
}

async function notifyNewTrialBooking(params: {
  leadName: string;
  leadPhone: string;
  section: "male" | "female" | null;
  startTime?: string;
  assignedTrainer: { id: string; name: string; phone: string | null } | null;
}) {
  const { leadName, leadPhone, section, startTime, assignedTrainer } = params;
  const when = startTime ? new Date(startTime).toLocaleString("en-US", { timeZone: "Asia/Riyadh" }) : "time TBD";
  const sectionLabel = section ? (section === "male" ? "Male" : "Female") : "unknown";
  const assignLabel = assignedTrainer ? `Assigned to ${assignedTrainer.name}.` : "Not auto-assigned — needs manual pick.";
  const message = `New 1 SAR trial booked: ${leadName} (${leadPhone}), ${when}. Section: ${sectionLabel}. ${assignLabel}`;

  const admins = await prisma.staff.findMany({
    where: { role: "admin", active: true, phone: { not: null } },
  });
  const recipients = new Map<string, string>();
  for (const admin of admins) if (admin.phone) recipients.set(admin.phone, admin.phone);
  if (assignedTrainer?.phone) recipients.set(assignedTrainer.phone, assignedTrainer.phone);

  await Promise.all(
    [...recipients.values()].map((phone) =>
      sendSms(phone, message).catch((err) => console.error(`Failed to SMS ${phone}:`, err))
    )
  );
}

type CalcomPayload = {
  uid?: string;
  rescheduleUid?: string;
  title?: string;
  startTime?: string;
  eventType?: { title?: string };
  attendees?: { name?: string; email?: string; phone?: string; smsReminderNumber?: string }[];
  responses?: Record<string, { label?: string; value?: unknown } | undefined>;
  customInputs?: { label?: string; value?: unknown }[];
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
      const section = inferSection(payload ?? {});
      const autoAssignedTrainer = await resolveAutoAssignedTrainer(section);

      const lead = await prisma.lead.create({
        data: {
          name: attendee?.name ?? "Unknown (cal.com)",
          phone: attendee?.phone ?? attendee?.smsReminderNumber ?? "unknown",
          source: "cal_com",
          interestedIn: "ems",
          section,
          status: "new",
          calcomBookingUid: uid,
          assignedStaffId: autoAssignedTrainer?.id ?? null,
        },
      });

      await prisma.activityLog.create({
        data: {
          leadId: lead.id,
          authorId: await getSystemAuthorId(),
          text: `Lead created from cal.com booking (${payload?.title ?? "free trial"}).${
            autoAssignedTrainer ? ` Auto-assigned to ${autoAssignedTrainer.name}.` : ""
          }`,
        },
      });

      await notifyNewTrialBooking({
        leadName: lead.name,
        leadPhone: lead.phone,
        section,
        startTime: payload?.startTime,
        assignedTrainer: autoAssignedTrainer,
      }).catch((err) => console.error("Failed to send trial-booking notification:", err));

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
