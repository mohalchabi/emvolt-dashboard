"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_PERIODS, type ReportPeriod } from "@/lib/report-periods";
import type { Dictionary } from "@/lib/i18n";

/**
 * Presets rather than a date-range picker: the questions actually asked are
 * "how did today go" and "how was last month", and two calendar inputs make
 * those slower to answer, not faster.
 */
export function ReportPeriodSelect({
  current,
  t,
}: {
  current: ReportPeriod;
  t: Dictionary["reports"];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function onChange(value: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={(v) => v && onChange(String(v))}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue>{(v: string) => t.periods[v as ReportPeriod]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {REPORT_PERIODS.map((p) => (
          <SelectItem key={p} value={p}>
            {t.periods[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
