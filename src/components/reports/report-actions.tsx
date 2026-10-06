"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Printer, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";

/**
 * The two ways a report leaves the app.
 *
 * Printing is the browser's own, which is deliberate: the reports are largely
 * in Arabic, and the browser shapes and orders Arabic correctly while every
 * lightweight PDF library in this stack would need the text reshaped by hand
 * and still get the bidirectional runs wrong. "Save as PDF" in the print
 * dialog produces a proper file on a phone as well as a desktop.
 *
 * Copying is here because the report's destination is a WhatsApp group, and
 * pasting text into one takes two taps where attaching a PDF takes six.
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
      <Button onClick={onCopy} variant="default">
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
