"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Printer, Copy, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

/** WhatsApp's own share link. No number, so it opens the chat picker. */
const WHATSAPP_SHARE = "https://wa.me/?text=";

/**
 * Keep well inside what a URL can carry across phone browsers and the Android
 * intent that WhatsApp is handed. A day with thirty classes won't get near it;
 * if one ever does, the link is dropped rather than silently cut in half.
 */
const SHARE_LIMIT = 1800;

/**
 * The ways a report leaves the app.
 *
 * Sending is a share link, not an API call. WhatsApp's Business API cannot post
 * to a group at all — that is Meta's restriction, not ours — so nothing can
 * deliver this to the trainers' group unattended. What it can do is hand the
 * finished text to WhatsApp with the group picker already open, which turns the
 * whole errand into two taps and needs no account, no number and no fees.
 *
 * Printing is the browser's own, which is deliberate: the reports are largely
 * in Arabic, and the browser shapes and orders Arabic correctly while every
 * lightweight PDF library in this stack would need the text reshaped by hand
 * and still get the bidirectional runs wrong. "Save as PDF" in the print
 * dialog produces a proper file on a phone as well as a desktop.
 *
 * Copying stays for the long report that won't fit in a link, and for desktops
 * where WhatsApp isn't signed in.
 */
export function ReportActions({
  plainText,
  t,
}: {
  /** The report already laid out as text, built on the server. */
  plainText: string;
  t: Dictionary["dailyReport"];
}) {
  const [copied, setCopied] = useState(false);
  const shareable = plainText.length <= SHARE_LIMIT;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success(t.copied);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t.copyFailed);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {shareable && (
        // A real link, not a scripted navigation: a phone only hands a tap off
        // to the WhatsApp app if the browser sees an ordinary outbound link.
        <a
          href={`${WHATSAPP_SHARE}${encodeURIComponent(plainText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          <WhatsappMark />
          {t.sendToWhatsapp}
        </a>
      )}
      <Button onClick={onCopy} variant={shareable ? "outline" : "default"}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {t.copyForWhatsapp}
      </Button>
      <Button onClick={() => window.print()} variant="outline">
        <Printer className="size-4" />
        {t.saveAsPdf}
      </Button>
    </div>
  );
}

/** lucide has no WhatsApp glyph, and the mark is what people look for. */
function WhatsappMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.65.81-.8.98-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.02 2.57c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  );
}
