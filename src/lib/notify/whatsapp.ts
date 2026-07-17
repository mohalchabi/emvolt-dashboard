import "server-only";

const isDev = process.env.NODE_ENV !== "production";

// No WhatsApp Sender is registered yet (needs Meta Business verification via
// Twilio Console — see TWILIO_WHATSAPP_FROM). Until then, and in development
// regardless, sends are just logged so campaign sending is buildable/testable
// without a live WhatsApp sender.
export function isWhatsappConfigured() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;
  return Boolean(!isDev && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM);
}

export async function sendWhatsappMessage(phone: string, body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;

  if (!isWhatsappConfigured()) {
    console.log(`[dev] WhatsApp to ${phone}: ${body}`);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    To: `whatsapp:${phone}`,
    From: TWILIO_WHATSAPP_FROM!,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to send WhatsApp message (${res.status}): ${detail}`);
  }
}
