import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

// Completely independent from src/auth.ts (NextAuth, staff-only). Customers
// authenticate with a phone + OTP, not Google — mixing that into NextAuth's
// session shape (which assumes a Staff row with a role) would mean touching
// every requireRole/requireSession call site in the staff app. A separate
// signed cookie keeps the two systems fully isolated.
export const CLIENT_SESSION_COOKIE = "emvolt_client_session";
const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days, refreshed each request

function getSecret() {
  const secret = process.env.CLIENT_SESSION_SECRET;
  if (!secret) throw new Error("CLIENT_SESSION_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export async function createClientSession(clientId: string) {
  const token = await new SignJWT({ clientId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export async function clearClientSession() {
  const store = await cookies();
  store.delete(CLIENT_SESSION_COOKIE);
}

export async function getClientSession() {
  const store = await cookies();
  const token = store.get(CLIENT_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const clientId = payload.clientId;
    if (typeof clientId !== "string") return null;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return null;

    return { client };
  } catch {
    return null;
  }
}

export async function requireClientSession() {
  const session = await getClientSession();
  if (!session) redirect("/portal/login");
  return session;
}
