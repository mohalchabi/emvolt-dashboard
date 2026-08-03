import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsappMessage } from "@/lib/notify/whatsapp";
import { label } from "@/lib/constants";

// Riyadh (Asia/Riyadh) is UTC+3 year-round — no DST, so a fixed offset is
// exact, not an approximation. Vercel Cron fires in UTC; this app has no
// other timezone-aware scheduling to reuse.
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

function riyadhDayBoundsUtc(now: Date) {
  const riyadhNow = new Date(now.getTime() + RIYADH_OFFSET_MS);
  const y = riyadhNow.getUTCFullYear();
  const m = riyadhNow.getUTCMonth();
  const d = riyadhNow.getUTCDate();
  const dayStartUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - RIYADH_OFFSET_MS);
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);
  return { dayStartUtc, dayEndUtc };
}

// Vercel Cron auto-attaches `Authorization: Bearer <CRON_SECRET>` to requests
// it triggers when that env var is set — this keeps the endpoint from being
// callable (and spamming trainers) by anyone who finds the URL.
function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured yet — allow, so this is testable before setup
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dayStartUtc, dayEndUtc } = riyadhDayBoundsUtc(new Date());

  const trainers = await prisma.staff.findMany({
    where: { role: "trainer", active: true, phone: { not: null } },
  });

  const results: { trainer: string; sessionCount: number; sent: boolean }[] = [];

  for (const trainer of trainers) {
    const sessions = await prisma.session.findMany({
      where: {
        trainerId: trainer.id,
        status: { not: "cancelled" },
        datetime: { gte: dayStartUtc, lt: dayEndUtc },
      },
      include: { client: true, lead: true },
      orderBy: { datetime: "asc" },
    });

    if (sessions.length === 0) {
      results.push({ trainer: trainer.name, sessionCount: 0, sent: false });
      continue;
    }

    const lines = sessions.map((s) => {
      const name = s.client?.name ?? s.lead?.name ?? "Unknown";
      const time = s.datetime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Riyadh",
      });
      return `${time} — ${label(s.type)} with ${name}`;
    });

    const message = `Good morning ${trainer.name}! Here's your schedule for today:\n\n${lines.join("\n")}\n\nHave a great day!`;

    try {
      await sendWhatsappMessage(trainer.phone!, message);
      results.push({ trainer: trainer.name, sessionCount: sessions.length, sent: true });
    } catch (err) {
      console.error(`Failed to send trainer reminder to ${trainer.name}:`, err);
      results.push({ trainer: trainer.name, sessionCount: sessions.length, sent: false });
    }
  }

  return NextResponse.json({ trainersChecked: trainers.length, results });
}
