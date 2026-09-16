import Image from "next/image";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import {
  PasswordLoginForm,
  type PasswordLoginState,
} from "@/components/auth/password-login-form";

const ADMIN_PHONE = "+966541233047";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  async function handleGoogleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  async function handlePasswordSignIn(
    _state: PasswordLoginState,
    formData: FormData
  ): Promise<PasswordLoginState> {
    "use server";
    const { t: dict } = await getDictionary();
    try {
      await signIn("password", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirectTo: "/",
      });
      return { error: null };
    } catch (err) {
      // A successful sign-in finishes by throwing the redirect, so that has to
      // travel on rather than be reported as a failure.
      if (err instanceof AuthError) return { error: dict.login.wrongPassword };
      throw err;
    }
  }

  const { t } = await getDictionary();
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 sm:p-10">
      <Image src="/logo-full-white.png" alt="EmVolt" width={640} height={629} className="h-32 w-auto sm:h-40" priority />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.login.title}</CardTitle>
          <CardDescription>{t.login.desc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t.login.accessDenied}{" "}
              <a href={`tel:${ADMIN_PHONE}`} className="font-medium underline">
                {ADMIN_PHONE}
              </a>
              .
            </p>
          )}
          <form action={handleGoogleSignIn}>
            <Button type="submit" className="w-full">
              {t.login.button}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t.login.or}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <PasswordLoginForm action={handlePasswordSignIn} t={t.login} />
        </CardContent>
      </Card>
    </div>
  );
}
