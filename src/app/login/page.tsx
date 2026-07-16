import Image from "next/image";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";

export default async function LoginPage() {
  async function handleGoogleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  const { t } = await getDictionary();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 sm:p-10">
      <Image src="/logo-full-white.png" alt="EmVolt" width={640} height={629} className="h-32 w-auto sm:h-40" priority />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.login.title}</CardTitle>
          <CardDescription>{t.login.desc}</CardDescription>
        </CardHeader>
        <CardContent>
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
