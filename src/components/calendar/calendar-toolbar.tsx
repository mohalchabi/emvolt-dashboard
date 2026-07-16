"use client";

import { useRouter, usePathname } from "next/navigation";
import { format, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SECTIONS, label } from "@/lib/constants";

export function CalendarToolbar({
  view,
  date,
  section,
  showSectionFilter,
  title,
}: {
  view: "day" | "week";
  date: Date;
  section?: string;
  showSectionFilter: boolean;
  title: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(nextDate: Date, nextView: "day" | "week" = view) {
    const params = new URLSearchParams(window.location.search);
    params.set("date", format(nextDate, "yyyy-MM-dd"));
    params.set("view", nextView);
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateSection(value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === "all") params.delete("section");
    else params.set("section", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function goPrev() {
    navigate(view === "day" ? subDays(date, 1) : subWeeks(date, 1));
  }

  function goNext() {
    navigate(view === "day" ? addDays(date, 1) : addWeeks(date, 1));
  }

  function goToday() {
    navigate(new Date());
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goPrev}>
          &larr;
        </Button>
        <Button variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={goNext}>
          &rarr;
        </Button>
        <span className="ml-2 text-sm font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        {showSectionFilter && (
          <Select value={section ?? "all"} onValueChange={(v) => v && updateSection(v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All sections">
                {(v: string) => (v === "all" ? "All sections" : label(v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {SECTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {label(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex overflow-hidden rounded-lg border border-border">
          <Button
            variant={view === "day" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => navigate(date, "day")}
          >
            Day
          </Button>
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => navigate(date, "week")}
          >
            Week
          </Button>
        </div>
      </div>
    </div>
  );
}
