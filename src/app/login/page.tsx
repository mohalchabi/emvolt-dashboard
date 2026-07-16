import Image from "next/image";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";

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
        </CardContent>
      </Card>
    </div>
  );
}
