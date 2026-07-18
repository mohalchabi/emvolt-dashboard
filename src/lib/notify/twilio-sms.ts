import "server-only";

// Plain Twilio Messages API (not Verify) — sends arbitrary text, reusing the
// same Twilio account already configured for OTP. WhatsApp would need a
// Meta Business-verified sender and pre-approved message template before it
// could send unprompted alerts like this one, which isn't set up yet; SMS
// works today with what's already configured and costs fractions of a cent
// per message at this volume.
export function isTwilioSmsConfigured() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
}

export async function sendSms(to: string, body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (!isTwilioSmsConfigured()) {
    console.log(`[dev] SMS to ${to}: ${body}`);
    return;
  }

  const auth = `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER!, Body: body }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to send SMS to ${to} (${res.status}): ${detail}`);
  }
}
