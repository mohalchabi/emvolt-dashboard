import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PETTY_CASH_CATEGORY } from "@/lib/constants";
import { navForRole, MY_PETTY_CASH_NAV } from "@/lib/nav";
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

  // One indexed lookup, and only for non-admins: the petty cash tab appears
  // for whoever is actually holding a float, and stays visible afterwards so
  // they can still open what they filed. Admins already have the full ledger.
  if (user.role !== "admin") {
    const float = await prisma.walletTransaction.findFirst({
      where: { category: PETTY_CASH_CATEGORY, payeeStaffId: user.id },
      select: { id: true },
    });
    if (float) items.push(MY_PETTY_CASH_NAV);
  }

  return (
    <AppShell items={items} user={{ name: user.name, role: user.role, section: user.section }} locale={locale} t={t}>
      {children}
    </AppShell>
  );
}
