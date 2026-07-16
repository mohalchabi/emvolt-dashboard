import "server-only";

const isDev = process.env.NODE_ENV !== "production";

// No SMS/WhatsApp provider is wired up yet (needs the studio's own Twilio
// account: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER). In the
// meantime — and in development regardless — the code is just logged so the
// whole login flow is buildable/testable without live credentials.
export async function sendOtpSms(phone: string, code: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (isDev || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log(`[dev] OTP for ${phone}: ${code}`);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: phone,
    From: TWILIO_FROM_NUMBER,
    Body: `Your EmVolt verification code is ${code}. It expires in 5 minutes.`,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to send OTP SMS (${res.status}): ${detail}`);
  }
}
