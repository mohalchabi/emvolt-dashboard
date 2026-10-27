"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

/**
 * Light or dark, sitting next to the language switch because it is the same
 * kind of choice.
 *
 * Which one is highlighted is decided by CSS, not by reading the stored theme.
 * The theme is only known in the browser, so rendering the highlight from it
 * would make the server and the client disagree on the markup; letting the
 * `dark` variant do it means the right button is lit from the first paint and
 * there is nothing to reconcile.
 */
export function ThemeToggle({ t }: { t: Dictionary["common"] }) {
  const { setTheme } = useTheme();

  const base = "flex items-center gap-1 rounded-md px-2 py-1 transition-colors";

  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5 text-xs font-medium print:hidden">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label={t.themeLight}
        className={cn(
          base,
          "bg-primary text-primary-foreground",
          "dark:bg-transparent dark:text-muted-foreground dark:hover:text-foreground"
        )}
      >
        <Sun className="size-3.5" />
        {t.themeLight}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label={t.themeDark}
        className={cn(
          base,
          "text-muted-foreground hover:text-foreground",
          "dark:bg-primary dark:text-primary-foreground dark:hover:text-primary-foreground"
        )}
      >
        <Moon className="size-3.5" />
        {t.themeDark}
      </button>
    </div>
  );
}
