import "server-only";

// Unifonic (Saudi-based) plain SMS send — replaces Twilio. Unlike Twilio
// Verify, this is just "send a text," with no OTP-specific product and no
// Meta/WhatsApp-style business verification: an account, an AppSid, and a
// registered sender name are enough. OTP generation/hashing/verification is
// handled entirely in src/lib/actions/client-auth.ts; this only delivers it.
export function isUnifonicConfigured() {
  const { UNIFONIC_APP_SID, UNIFONIC_SENDER_ID } = process.env;
  return Boolean(UNIFONIC_APP_SID && UNIFONIC_SENDER_ID);
}

export async function sendSms(to: string, body: string) {
  const { UNIFONIC_APP_SID, UNIFONIC_SENDER_ID } = process.env;

  if (!isUnifonicConfigured()) {
    console.log(`[dev] SMS to ${to}: ${body}`);
    return;
  }

  const res = await fetch("https://el.cloud.unifonic.com/rest/SMS/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      AppSid: UNIFONIC_APP_SID,
      SenderID: UNIFONIC_SENDER_ID,
      Body: body,
      Recipient: to.replace(/^\+/, ""), // Unifonic expects digits only, no leading +
    }),
  });

  const data = await res.json().catch(() => null);
  // Unifonic can return HTTP 200 with an error code in the body, so a 2xx
  // status alone doesn't mean the send succeeded — check its own success flag.
  if (!res.ok || data?.success === false) {
    throw new Error(`Failed to send SMS to ${to} (${res.status}): ${JSON.stringify(data)}`);
  }
}
