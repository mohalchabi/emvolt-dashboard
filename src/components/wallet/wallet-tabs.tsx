"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/wallet", label: "Ledger" },
  { href: "/wallet/petty-cash", label: "Petty Cash" },
];

/**
 * `showLedger` is false for the trainers manager, who reaches petty cash but
 * not the ledger. Linking them to a page that redirects them straight back out
 * would just look broken.
 */
export function WalletTabs({ showLedger = true }: { showLedger?: boolean }) {
  const pathname = usePathname();
  const tabs = showLedger ? TABS : TABS.filter((t) => t.href !== "/wallet");

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
