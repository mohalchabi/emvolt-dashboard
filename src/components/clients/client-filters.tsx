"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLIENT_STATUSES, SECTIONS, label } from "@/lib/constants";
import type { Staff } from "@/generated/prisma/client";

export function ClientFilters({
  currentStatus,
  currentSection,
  currentTrainer,
  trainers,
}: {
  currentStatus?: string;
  currentSection?: string;
  currentTrainer?: string;
  trainers: Staff[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParam(key: "status" | "section" | "trainer", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={currentStatus ?? "all"} onValueChange={(v) => updateParam("status", String(v))}>
        <SelectTrigger className="w-[calc(50%-0.375rem)] sm:w-40">
          <SelectValue placeholder="All statuses">
            {(v: string) => (v === "all" ? "All statuses" : label(v))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {CLIENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {label(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSection ?? "all"} onValueChange={(v) => updateParam("section", String(v))}>
        <SelectTrigger className="w-[calc(50%-0.375rem)] sm:w-40">
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

      <Select value={currentTrainer ?? "all"} onValueChange={(v) => updateParam("trainer", String(v))}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All trainers">
            {(v: string) => (v === "all" ? "All trainers" : trainers.find((t) => t.id === v)?.name ?? v)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All trainers</SelectItem>
          {trainers.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
