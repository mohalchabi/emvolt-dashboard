"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { clockEventSchema, type ClockEventInput } from "@/lib/schemas/attendance";

/**
 * Attendance is per-person and self-service: anyone signed in clocks themselves
 * in and out. There is deliberately no "clock someone else in" — the whole
 * point of recording a position is that it belongs to the person who tapped.
 */

/** The last event for a staff member, which is what says whether they're on shift. */
export async function currentClockState(staffId: string) {
  const last = await prisma.clockEvent.findFirst({
    where: { staffId },
    orderBy: { at: "desc" },
  });
  return { isClockedIn: last?.kind === "in", last };
}

async function recordClockEvent(kind: "in" | "out", input: ClockEventInput) {
  const session = await requireSession();
  const data = clockEventSchema.parse(input);

  // Re-derive the state from the database rather than trusting what the page
  // was showing: two taps on a slow connection, or a stale tab left open
  // overnight, would otherwise write a second "in" and silently break the
  // pairing that any hours calculation depends on.
  const { isClockedIn } = await currentClockState(session.user.id);
  if (kind === "in" && isClockedIn) {
    throw new Error("You're already clocked in.");
  }
  if (kind === "out" && !isClockedIn) {
    throw new Error("You're not clocked in.");
  }

  const event = await prisma.clockEvent.create({
    data: {
      staffId: session.user.id,
      kind,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy ?? null,
      // A reason only means anything on the way out.
      departureReason: kind === "out" ? (data.departureReason ?? null) : null,
      note: data.note || null,
    },
  });

  revalidatePath("/attendance");
  revalidatePath("/");
  return event;
}

export async function clockIn(input: ClockEventInput) {
  return recordClockEvent("in", input);
}

export async function clockOut(input: ClockEventInput) {
  return recordClockEvent("out", input);
}
