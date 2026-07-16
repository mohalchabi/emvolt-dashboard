import { prisma } from "@/lib/db";

// Automated/non-interactive activity-log entries (webhooks, portal actions
// taken by a client) still need a Staff author since ActivityLog.authorId is
// a required FK — attribute them to the first active admin rather than
// adding a nullable/"system" author column.
export async function getSystemAuthorId() {
  const admin = await prisma.staff.findFirst({ where: { role: "admin", active: true } });
  if (!admin) throw new Error("No active admin found to attribute this activity to.");
  return admin.id;
}
