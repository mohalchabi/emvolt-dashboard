"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonth } from "@/lib/wallet";

export const ALL_TIME = "all";

export function WalletPeriodSelect({
  current,
  months,
}: {
  current: string;
  months: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function onChange(value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === ALL_TIME) params.delete("month");
    else params.set("month", value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Select value={current} onValueChange={(v) => v && onChange(String(v))}>
      <SelectTrigger className="w-full sm:w-52">
        <SelectValue>{(v: string) => (v === ALL_TIME ? "All time" : formatMonth(v))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_TIME}>All time</SelectItem>
        {months.map((month) => (
          <SelectItem key={month} value={month}>
            {formatMonth(month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
