"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n";

export type PasswordLoginState = { error: string | null };

/**
 * The sign-in form for staff who don't use Google.
 *
 * The action reports failure by returning it rather than throwing, so the
 * wrong-password case renders as a message with the email still filled in
 * instead of dropping the person on an error page.
 */
export function PasswordLoginForm({
  action,
  t,
}: {
  action: (state: PasswordLoginState, formData: FormData) => Promise<PasswordLoginState>;
  t: Dictionary["login"];
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">{t.emailLabel}</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          dir="ltr"
          placeholder="name@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">{t.passwordLabel}</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
        />
      </div>

      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
        {isPending ? t.signingIn : t.passwordButton}
      </Button>
    </form>
  );
}
