import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";

export default async function DevLoginPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const staff = await prisma.staff.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const { locale, t } = await getDictionary();

  async function loginAs(formData: FormData) {
    "use server";
    const staffId = String(formData.get("staffId"));
    await signIn("dev-login", { staffId, redirectTo: "/" });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 sm:p-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo-full-white.png" alt="EmVolt" width={640} height={629} className="h-32 w-auto sm:h-40" priority />
        <span className="font-heading text-base font-semibold tracking-tight text-muted-foreground sm:text-lg">
          {t.devLogin.subtitle}
        </span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t.devLogin.cardTitle}</CardTitle>
          <CardDescription>{t.devLogin.cardDesc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {staff.map((s) => (
            <form key={s.id} action={loginAs}>
              <input type="hidden" name="staffId" value={s.id} />
              <Button
                type="submit"
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex flex-col items-start">
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.email}</span>
                </span>
                <span className="flex gap-1">
                  <Badge variant="secondary">{label(s.role, locale)}</Badge>
                  {s.section && <Badge variant="outline">{label(s.section, locale)}</Badge>}
                </span>
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
