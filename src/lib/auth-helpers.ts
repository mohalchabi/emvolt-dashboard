import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { StaffRole } from "@/lib/constants";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect(process.env.NODE_ENV === "development" ? "/dev-login" : "/login");
  return session;
}

export async function requireRole(roles: StaffRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) redirect("/");
  return session;
}
