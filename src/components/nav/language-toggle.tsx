"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setLocale } from "@/lib/actions/locale";
import type { Locale } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5 text-xs font-medium">
      <button
        type="button"
        onClick={() => switchTo("en")}
        disabled={isPending}
        className={cn(
          "rounded-md px-2 py-1 transition-colors",
          locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        disabled={isPending}
        className={cn(
          "rounded-md px-2 py-1 transition-colors",
          locale === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        AR
      </button>
    </div>
  );
}
