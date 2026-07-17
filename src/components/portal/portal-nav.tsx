"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, CalendarPlus, Package, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOutClientAction } from "@/lib/actions/client-auth";

const NAV_ITEMS = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/classes", label: "Classes", icon: CalendarDays },
  { href: "/portal/book", label: "Book", icon: CalendarPlus },
  { href: "/portal/packages", label: "Packages", icon: Package },
  { href: "/portal/inbody", label: "InBody", icon: Activity },
];

export function PortalNav({ clientName }: { clientName: string }) {
  const pathname = usePathname();

  return (
    <>
      <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <Image src="/logo-mark-color.png" alt="" width={140} height={96} className="h-8 w-auto" />
          <span className="font-heading text-sm font-semibold tracking-tight">EmVolt</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">{clientName}</span>
          <form action={signOutClientAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <nav className="flex items-center gap-1 border-b bg-sidebar px-2 py-1.5 text-sidebar-foreground">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:flex-row sm:justify-center sm:gap-1.5 sm:text-sm",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
