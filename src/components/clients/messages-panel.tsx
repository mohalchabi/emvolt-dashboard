"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sendStaffMessage } from "@/lib/actions/clients";
import type { Message, Staff } from "@/generated/prisma/client";

type MessageWithAuthor = Message & { authorStaff: Staff | null };

export function MessagesPanel({
  clientId,
  clientName,
  messages,
}: {
  clientId: string;
  clientName: string;
  messages: MessageWithAuthor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");

  function onSend() {
    if (!text.trim()) return;
    startTransition(async () => {
      try {
        await sendStaffMessage({ clientId, text: text.trim() });
        setText("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not send message.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No messages yet.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex flex-col gap-0.5", m.authorIsClient ? "items-start" : "items-end")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  m.authorIsClient ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                )}
              >
                {m.text}
              </div>
              <span className="text-xs text-muted-foreground">
                {m.authorIsClient ? clientName : (m.authorStaff?.name ?? "Staff")} ·{" "}
                {m.createdAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder={`Reply to ${clientName}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-16"
            disabled={isPending}
          />
          <Button onClick={onSend} disabled={isPending || !text.trim()} className="self-end">
            {isPending ? "Sending..." : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
