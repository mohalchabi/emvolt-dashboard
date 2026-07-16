import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import type { StaffRole, Section } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: StaffRole;
      section: Section | null;
    };
  }
}

// `next-auth/jwt`'s package-exports subpath doesn't resolve for ambient
// `declare module` augmentation under this project's TS module resolution
// (the augmentation silently fails to merge, leaving `token.staffId` etc.
// untyped) — a plain type-only import + local intersection sidesteps it.
type AppJWT = JWT & {
  staffId?: string;
  role?: StaffRole;
  section?: Section | null;
};

const isDev = process.env.NODE_ENV === "development";

const providers: NextAuthConfig["providers"] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  }),
];

// Dev-only impersonation login. Never registered outside development, so it
// cannot exist as an attack surface in production regardless of env vars.
if (isDev) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: { staffId: { label: "Staff ID", type: "text" } },
      async authorize(credentials) {
        const staffId = credentials?.staffId;
        if (typeof staffId !== "string") return null;
        const staff = await prisma.staff.findUnique({ where: { id: staffId } });
        if (!staff || !staff.active) return null;
        return { id: staff.id, name: staff.name, email: staff.email };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: isDev ? "/dev-login" : "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const staff = await prisma.staff.findUnique({ where: { email: user.email } });
      return !!staff && staff.active;
    },
    async jwt({ token, user }) {
      const t = token as AppJWT;
      if (user?.email) {
        const staff = await prisma.staff.findUnique({ where: { email: user.email } });
        if (staff) {
          t.staffId = staff.id;
          t.role = staff.role as StaffRole;
          t.section = (staff.section as Section | null) ?? null;
          t.name = staff.name;
        }
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as AppJWT;
      if (t.staffId) {
        session.user.id = t.staffId;
        session.user.role = t.role as StaffRole;
        session.user.section = (t.section as Section | null) ?? null;
        session.user.name = t.name ?? session.user.name ?? "";
      }
      return session;
    },
  },
});
