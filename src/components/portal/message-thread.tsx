"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendClientMessage } from "@/lib/actions/portal";

type MessageView = { id: string; text: string; createdAt: string; fromMe: boolean };

export function MessageThread({
  messages,
  senderNameForOthers,
}: {
  messages: MessageView[];
  senderNameForOthers: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");

  function onSend() {
    if (!text.trim()) return;
    startTransition(async () => {
      try {
        await sendClientMessage(text.trim());
        setText("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not send message.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
        {messages.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No messages yet — say hello to {senderNameForOthers}.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex flex-col gap-0.5", m.fromMe ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                m.fromMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}
            >
              {m.text}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(m.createdAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="Write a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-16"
          disabled={isPending}
        />
        <Button onClick={onSend} disabled={isPending || !text.trim()} className="self-end">
          {isPending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
