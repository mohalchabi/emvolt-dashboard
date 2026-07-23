"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { sendLeadCampaign } from "@/lib/actions/leads";
import type { Dictionary } from "@/lib/i18n";

const DEFAULT_MESSAGE = `⚡ EmVolt — Train Smarter with EMS
EMS (Electrical Muscle Stimulation) activates up to 90% of your muscles in one 20-minute session — like hours of a regular workout, without the wear on your joints.
Try your first session for just 1 SAR.
Book now: emvolt.sa

⚡ إمفولت - تمرين أذكى مع تقنية EMS
تقنية EMS (التحفيز الكهربائي للعضلات) تنشّط حتى 90% من عضلاتك في جلسة واحدة مدتها 20 دقيقة فقط - كأنك تمرنت لساعات، بدون إجهاد المفاصل.
جرّب أول جلسة بـ 1 ريال فقط.
احجز الآن: emvolt.sa`;

export function SendCampaignDialog({
  open,
  onOpenChange,
  leadIds,
  onSent,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onSent: () => void;
  t: Dictionary["sendCampaignDialog"];
}) {
  const router = useRouter();
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [isPending, startTransition] = useTransition();

  function onSend() {
    if (!message.trim()) return;
    startTransition(async () => {
      try {
        const result = await sendLeadCampaign({ leadIds, message: message.trim() });
        if (result.simulated) {
          toast.success(t.simulatedResult.replace("{count}", String(result.sent)));
        } else {
          toast.success(t.sentResult.replace("{count}", String(result.sent)));
        }
        if (result.failed > 0) {
          toast.error(t.failedResult.replace("{count}", String(result.failed)));
        }
        onOpenChange(false);
        onSent();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.couldNotSend);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.title.replace("{count}", String(leadIds.length))}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-48 font-mono text-sm"
          disabled={isPending}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t.cancel}
          </Button>
          <Button onClick={onSend} disabled={isPending || !message.trim()}>
            {isPending ? t.sending : t.send.replace("{count}", String(leadIds.length))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
