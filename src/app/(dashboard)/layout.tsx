import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { navForRole } from "@/lib/nav";
import { getDictionary } from "@/lib/i18n";
import { AppShell } from "@/components/nav/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect(process.env.NODE_ENV === "development" ? "/dev-login" : "/login");

  const { user } = session;
  const items = navForRole(user.role);
  const { locale, t } = await getDictionary();

  return (
    <AppShell items={items} user={{ name: user.name, role: user.role, section: user.section }} locale={locale} t={t}>
      {children}
    </AppShell>
  );
}
