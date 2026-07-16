"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { SignOutButton } from "@/components/nav/sign-out-button";
import { LanguageToggle } from "@/components/nav/language-toggle";
import { label } from "@/lib/constants";
import type { NavItem } from "@/lib/nav";
import type { Dictionary, Locale } from "@/lib/i18n";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo-mark-color.png" alt="" width={140} height={96} className="h-8 w-auto" />
      <span className="font-heading text-sm font-semibold tracking-tight">EmVolt</span>
    </div>
  );
}

function UserSummary({
  user,
  locale,
}: {
  user: { name: string; role: string; section: string | null };
  locale: Locale;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col overflow-hidden">
        <span className="truncate text-sm font-medium">{user.name}</span>
        <div className="flex gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {label(user.role, locale)}
          </Badge>
          {user.section && (
            <Badge variant="outline" className="text-[10px]">
              {label(user.section, locale)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  items,
  user,
  locale,
  t,
  children,
}: {
  items: NavItem[];
  user: { name: string; role: string; section: string | null };
  locale: Locale;
  t: Dictionary;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={t.common.openMenu}>
            <Menu className="size-5" />
          </Button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t.common.closeMenu}>
                <X className="size-5" />
              </Button>
            </div>
            <SidebarNav items={items} nav={t.nav} />
            <div className="mt-auto flex flex-col gap-3 border-t pt-4">
              <UserSummary user={user} locale={locale} />
              <SignOutButton label={t.common.signOut} />
            </div>
          </div>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
        </div>
        <SidebarNav items={items} nav={t.nav} />
        <div className="mt-auto flex flex-col gap-3 border-t pt-4">
          <LanguageToggle locale={locale} />
          <UserSummary user={user} locale={locale} />
          <SignOutButton label={t.common.signOut} />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
