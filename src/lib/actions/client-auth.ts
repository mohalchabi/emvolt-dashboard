"use server";

import { randomInt, createHmac, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClientSession, clearClientSession } from "@/lib/client-auth";
import { isTwilioVerifyConfigured, startOtpVerification, checkOtpVerification, logOtpSms } from "@/lib/notify/sms";
import { requestOtpSchema, verifyOtpSchema, type RequestOtpInput, type VerifyOtpInput } from "@/lib/schemas/client-auth";

const CODE_TTL_MS = 5 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_REQUESTS_PER_DAY = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(phone: string, code: string) {
  const secret = process.env.CLIENT_SESSION_SECRET;
  if (!secret) throw new Error("CLIENT_SESSION_SECRET is not set.");
  return createHmac("sha256", secret).update(`otp:${phone}:${code}`).digest("hex");
}

export async function requestOtp(input: RequestOtpInput) {
  const { phone } = requestOtpSchema.parse(input);

  const matches = await prisma.client.findMany({ where: { phone } });
  if (matches.length === 0) {
    throw new Error("We don't have an account for this number. Please contact the studio.");
  }

  const dayAgo = new Date(Date.now() - 24 * 3_600_000);
  const recent = await prisma.clientOtp.findMany({
    where: { phone, createdAt: { gte: dayAgo } },
    orderBy: { createdAt: "desc" },
  });
  if (recent.length >= MAX_REQUESTS_PER_DAY) {
    throw new Error("Too many codes requested for this number today. Try again tomorrow.");
  }
  const last = recent[0];
  if (last && !last.consumedAt && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new Error("Please wait a moment before requesting another code.");
  }

  if (isTwilioVerifyConfigured()) {
    await startOtpVerification(phone);
    await prisma.clientOtp.create({
      data: { phone, provider: "twilio", expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
    return;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.clientOtp.create({
    data: {
      phone,
      provider: "local",
      codeHash: hashCode(phone, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  await logOtpSms(phone, code);
}

export type VerifyOtpResult =
  | { status: "success" }
  | { status: "choose"; candidates: { id: string; name: string }[] };

export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  const { phone, code, clientId } = verifyOtpSchema.parse(input);

  const otp = await prisma.clientOtp.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new Error("That code has expired. Request a new one.");
  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new Error("Too many incorrect attempts. Request a new code.");
  }

  let isMatch: boolean;
  if (otp.provider === "twilio") {
    if (otp.verifiedAt) {
      // Already confirmed with Twilio on an earlier submission (e.g. the
      // multi-account picker resubmitting the same code) — Twilio would
      // 404 a second check, so trust our cached result instead.
      isMatch = true;
    } else {
      isMatch = await checkOtpVerification(phone, code);
      if (isMatch) {
        await prisma.clientOtp.update({ where: { id: otp.id }, data: { verifiedAt: new Date() } });
      }
    }
  } else {
    const expected = Buffer.from(hashCode(phone, code));
    const got = Buffer.from(otp.codeHash ?? "");
    isMatch = expected.length === got.length && timingSafeEqual(expected, got);
  }

  if (!isMatch) {
    await prisma.clientOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new Error("Incorrect code.");
  }

  // Only mark the code consumed once we can actually complete sign-in. When
  // there's more than one matching account, the picker step re-submits this
  // same code with a chosen clientId — the OTP must still validate then.
  const matches = await prisma.client.findMany({ where: { phone } });
  if (matches.length === 0) {
    throw new Error("We don't have an account for this number. Please contact the studio.");
  }

  if (matches.length === 1) {
    await prisma.clientOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    await createClientSession(matches[0].id);
    return { status: "success" };
  }

  if (clientId) {
    const chosen = matches.find((c) => c.id === clientId);
    if (!chosen) throw new Error("Could not find that account.");
    await prisma.clientOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    await createClientSession(chosen.id);
    return { status: "success" };
  }

  return { status: "choose", candidates: matches.map((c) => ({ id: c.id, name: c.name })) };
}

export async function signOutClientAction() {
  await clearClientSession();
  redirect("/portal/login");
}
