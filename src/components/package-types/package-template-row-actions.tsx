"use client";

import { useTransition, type FocusEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePackageTemplate, setPackageTemplateActive } from "@/lib/actions/package-templates";
import { SECTIONS, label } from "@/lib/constants";
import type { PackageTemplate } from "@/generated/prisma/client";

const BOTH = "both";

function useFieldUpdate(template: PackageTemplate) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function commit(
    field: "name" | "sessions" | "durationDays" | "price" | "section",
    value: string | number | null,
  ) {
    startTransition(async () => {
      try {
        await updatePackageTemplate({
          templateId: template.id,
          name: field === "name" ? String(value) : template.name,
          sessions: field === "sessions" ? Number(value) : template.sessions,
          durationDays: field === "durationDays" ? Number(value) : template.durationDays,
          price: field === "price" ? Number(value) : template.price,
          section: field === "section" ? (value as "male" | "female" | null) : (template.section as "male" | "female" | null),
        });
        router.refresh();
      } catch {
        toast.error("Could not update package type.");
      }
    });
  }

  return { commit, isPending };
}

export function PackageTemplateEditableCells({
  template,
  layout,
}: {
  template: PackageTemplate;
  layout: "row" | "stacked";
}) {
  const { commit, isPending } = useFieldUpdate(template);

  function onBlurNumber(field: "sessions" | "durationDays" | "price") {
    return (e: FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim();
      const value = Number(raw);
      if (raw === "" || Number.isNaN(value) || value < 0) return;
      if (value === Number(template[field])) return;
      commit(field, value);
    };
  }

  function onBlurName(e: FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    if (!value || value === template.name) return;
    commit("name", value);
  }

  function onSectionChange(v: string | null) {
    if (!v) return;
    commit("section", v === BOTH ? null : v);
  }

  const sectionSelect = (
    <Select key={template.section} value={template.section ?? BOTH} onValueChange={onSectionChange}>
      <SelectTrigger disabled={isPending} className="w-full">
        <SelectValue>{(v: string) => (v === BOTH ? "Both" : label(v))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={BOTH}>Both</SelectItem>
        {SECTIONS.map((s) => (
          <SelectItem key={s} value={s}>
            {label(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (layout === "stacked") {
    return (
      <div className="flex flex-col gap-2">
        <Input key={template.name} defaultValue={template.name} onBlur={onBlurName} disabled={isPending} className="font-medium" />
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Sessions</Label>
            <Input key={template.sessions} type="number" min={1} defaultValue={template.sessions} onBlur={onBlurNumber("sessions")} disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Days</Label>
            <Input key={template.durationDays} type="number" min={1} defaultValue={template.durationDays} onBlur={onBlurNumber("durationDays")} disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Price (SAR)</Label>
            <Input key={template.price} type="number" min={0} step="0.01" defaultValue={template.price} onBlur={onBlurNumber("price")} disabled={isPending} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Applies to</Label>
          {sectionSelect}
        </div>
      </div>
    );
  }

  return (
    <>
      <TableCell>
        <Input key={template.name} defaultValue={template.name} onBlur={onBlurName} disabled={isPending} className="w-40 font-medium" />
      </TableCell>
      <TableCell>
        <Input key={template.sessions} type="number" min={1} defaultValue={template.sessions} onBlur={onBlurNumber("sessions")} disabled={isPending} className="w-20" />
      </TableCell>
      <TableCell>
        <Input key={template.durationDays} type="number" min={1} defaultValue={template.durationDays} onBlur={onBlurNumber("durationDays")} disabled={isPending} className="w-24" />
      </TableCell>
      <TableCell>
        <Input key={template.price} type="number" min={0} step="0.01" defaultValue={template.price} onBlur={onBlurNumber("price")} disabled={isPending} className="w-28" />
      </TableCell>
      <TableCell className="w-32">{sectionSelect}</TableCell>
    </>
  );
}

export function PackageTemplateActiveToggle({ template }: { template: PackageTemplate }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      try {
        await setPackageTemplateActive({ templateId: template.id, active: !template.active });
        router.refresh();
      } catch {
        toast.error("Could not update status.");
      }
    });
  }

  return (
    <Button variant={template.active ? "outline" : "secondary"} size="sm" onClick={toggle} disabled={isPending}>
      {template.active ? "Active" : "Inactive"}
    </Button>
  );
}
