"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navLabel, type NavItem } from "@/lib/nav";
import type { Dictionary } from "@/lib/i18n";

export function SidebarNav({ items, nav }: { items: NavItem[]; nav: Dictionary["nav"] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {navLabel(item, nav)}
          </Link>
        );
      })}
    </nav>
  );
}
