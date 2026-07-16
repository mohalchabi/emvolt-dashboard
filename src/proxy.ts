import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/dev-login", "/login", "/api/auth", "/api/webhooks"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic || req.auth) return NextResponse.next();

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
