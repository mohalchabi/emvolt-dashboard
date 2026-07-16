"use server";

import { signOut } from "@/auth";

export async function signOutAction() {
  await signOut({ redirectTo: process.env.NODE_ENV === "development" ? "/dev-login" : "/login" });
}
