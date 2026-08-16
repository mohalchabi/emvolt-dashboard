"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import { SESSION_STATUSES, type SessionStatus, isManagerRole } from "@/lib/constants";

/**
 * Close out a session after it happens — attended, didn't show, cancelled.
 *
 * This is what makes a package count down: packageBalances() only counts
 * sessions with status "completed", so a session left as "scheduled" forever
 * means the client's remaining sessions never decrease.
 */
export async function updateSessionStatus(input: { sessionId: string; status: string }) {
  const auth = await requireSession();

  if (!SESSION_STATUSES.includes(input.status as SessionStatus)) {
    throw new Error("Unknown session status.");
  }

  const session = await prisma.session.findUnique({
    where: { id: input.sessionId },
    select: { id: true, trainerId: true, clientId: true, leadId: true },
  });
  if (!session) throw new Error("That session no longer exists.");

  // Managers and front desk cover the whole studio; a trainer may only close
  // out sessions on their own schedule.
  const isStaffWide = isManagerRole(auth.user.role) || auth.user.role === "front_desk";
  if (!isStaffWide && session.trainerId !== auth.user.id) {
    throw new Error("You can only update your own sessions.");
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { status: input.status },
  });

  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/my-clients");
  if (session.clientId) revalidatePath(`/clients/${session.clientId}`);
  if (session.leadId) revalidatePath(`/leads/${session.leadId}`);
}
