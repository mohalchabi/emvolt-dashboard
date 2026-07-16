"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requestOtp, verifyOtp } from "@/lib/actions/client-auth";

type Step = "phone" | "code" | { kind: "choose"; candidates: { id: string; name: string }[] };

export default function PortalLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  function onRequestOtp() {
    if (!phone.trim()) return;
    startTransition(async () => {
      try {
        await requestOtp({ phone: phone.trim() });
        setStep("code");
        toast.success("Code sent.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not send code.");
      }
    });
  }

  function onVerify(clientId?: string) {
    if (!code.trim()) return;
    startTransition(async () => {
      try {
        const result = await verifyOtp({ phone: phone.trim(), code: code.trim(), clientId });
        if (result.status === "success") {
          router.push("/portal");
          router.refresh();
        } else {
          setStep({ kind: "choose", candidates: result.candidates });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not verify code.");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 sm:p-10">
      <Image src="/logo-full-white.png" alt="EmVolt" width={640} height={629} className="h-32 w-auto sm:h-40" priority />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {step === "phone" && "Enter the phone number on file with the studio."}
            {step === "code" && `Enter the code sent to ${phone}.`}
            {typeof step === "object" && "Which account is yours?"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === "phone" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+9665xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <Button onClick={onRequestOtp} disabled={isPending || !phone.trim()}>
                {isPending ? "Sending..." : "Send code"}
              </Button>
            </>
          )}

          {step === "code" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <Button onClick={() => onVerify()} disabled={isPending || code.trim().length !== 6}>
                {isPending ? "Verifying..." : "Verify"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep("phone")} disabled={isPending}>
                Use a different number
              </Button>
            </>
          )}

          {typeof step === "object" && (
            <div className="flex flex-col gap-2">
              {step.candidates.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => onVerify(c.id)}
                  disabled={isPending}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
