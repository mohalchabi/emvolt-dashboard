import "server-only";

const isDev = process.env.NODE_ENV !== "production";

export function isTwilioVerifyConfigured() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  return Boolean(!isDev && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID);
}

function verifyAuthHeader() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  return `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`;
}

// Twilio Verify (not the plain Messages API) generates, sends, and checks the
// code itself, routing per-country — needed because plain SMS from a US
// longcode is rejected outright by some carriers (e.g. Saudi Arabia, error
// 21612). See src/lib/actions/client-auth.ts for the local-code fallback
// used in dev and any environment without Verify configured.
export async function startOtpVerification(phone: string) {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const res = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: verifyAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, Channel: "sms" }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to send OTP SMS (${res.status}): ${detail}`);
  }
}

export async function checkOtpVerification(phone: string, code: string): Promise<boolean> {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const res = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: verifyAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, Code: code }),
  });

  if (res.status === 404) return false; // no pending verification for this number
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to verify OTP (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { status: string };
  return data.status === "approved";
}

// Local dev bypass — no Twilio Verify configured, so just log the code the
// caller generated instead of sending it anywhere.
export async function logOtpSms(phone: string, code: string) {
  console.log(`[dev] OTP for ${phone}: ${code}`);
}
