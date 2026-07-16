"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, SECTIONS, label } from "@/lib/constants";
import type { Dictionary, Locale } from "@/lib/i18n";

export function LeadFilters({
  currentStatus,
  currentSection,
  t,
  locale,
}: {
  currentStatus?: string;
  currentSection?: string;
  t: Dictionary["leadFilters"];
  locale: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParam(key: "status" | "section", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={currentStatus ?? "all"} onValueChange={(v) => updateParam("status", String(v))}>
        <SelectTrigger className="w-[calc(50%-0.375rem)] sm:w-44">
          <SelectValue placeholder={t.allStatuses}>
            {(v: string) => (v === "all" ? t.allStatuses : label(v, locale))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.allStatuses}</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {label(s, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSection ?? "all"} onValueChange={(v) => updateParam("section", String(v))}>
        <SelectTrigger className="w-[calc(50%-0.375rem)] sm:w-40">
          <SelectValue placeholder={t.allSections}>
            {(v: string) => (v === "all" ? t.allSections : label(v, locale))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.allSections}</SelectItem>
          {SECTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {label(s, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
