import { NextResponse } from "next/server";
import { auth } from "@/auth";

// /api/inbody does its own dual auth check (staff session OR client session
// owning the result) rather than the staff-only check below — see
// src/app/api/inbody/[id]/route.ts.
const PUBLIC_PATHS = ["/dev-login", "/login", "/api/auth", "/api/webhooks", "/api/inbody"];

// The customer portal is a separate app with its own auth (phone + OTP,
// checked via requireClientSession() in src/app/portal/(app)/layout.tsx) —
// it must never be gated by the staff-only NextAuth check below.
const PORTAL_PREFIX = "/portal";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic || pathname.startsWith(PORTAL_PREFIX) || req.auth) return NextResponse.next();

  const signInPath = process.env.NODE_ENV === "development" ? "/dev-login" : "/login";
  const url = req.nextUrl.clone();
  url.pathname = signInPath;
  return NextResponse.redirect(url);
});

export const config = {
  // Excludes _next internals and any file in public/ (icon.png, logo-*.png,
  // etc. — anything with a file extension) from the auth gate, so login
  // pages can render brand assets before the user is signed in.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
