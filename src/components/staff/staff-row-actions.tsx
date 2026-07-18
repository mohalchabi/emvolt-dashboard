"use client";

import { useTransition, type FocusEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAFF_ROLES, SECTIONS, label } from "@/lib/constants";
import {
  updateStaffRole,
  updateStaffSection,
  updateStaffTarget,
  updateStaffPhone,
  setStaffActive,
} from "@/lib/actions/staff";
import type { Staff } from "@/generated/prisma/client";

export function StaffRoleSelect({ staff }: { staff: Staff }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(role: string) {
    startTransition(async () => {
      try {
        await updateStaffRole({ staffId: staff.id, role });
        router.refresh();
      } catch {
        toast.error("Could not update role.");
      }
    });
  }

  return (
    <Select value={staff.role} onValueChange={(v) => v && onChange(v)} disabled={isPending}>
      <SelectTrigger className="w-32">
        <SelectValue>{(v: string) => label(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STAFF_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {label(r)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StaffSectionSelect({ staff }: { staff: Staff }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (staff.role !== "trainer") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  function onChange(section: string) {
    startTransition(async () => {
      try {
        await updateStaffSection({ staffId: staff.id, section });
        router.refresh();
      } catch {
        toast.error("Could not update section.");
      }
    });
  }

  return (
    <Select value={staff.section ?? "male"} onValueChange={(v) => v && onChange(v)} disabled={isPending}>
      <SelectTrigger className="w-28">
        <SelectValue>{(v: string) => label(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SECTIONS.map((s) => (
          <SelectItem key={s} value={s}>
            {label(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StaffTargetInput({ staff }: { staff: Staff }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onBlur(e: FocusEvent<HTMLInputElement>) {
    const raw = e.target.value.trim();
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (Number.isNaN(value) || value < 0)) return;
    if (value === (staff.leadTarget ?? null)) return;
    startTransition(async () => {
      try {
        await updateStaffTarget({ staffId: staff.id, leadTarget: value });
        router.refresh();
      } catch {
        toast.error("Could not update target.");
      }
    });
  }

  return (
    <Input
      key={staff.leadTarget ?? "unset"}
      type="number"
      min={0}
      defaultValue={staff.leadTarget ?? ""}
      placeholder="—"
      onBlur={onBlur}
      disabled={isPending}
      className="w-20"
    />
  );
}

export function StaffPhoneInput({ staff }: { staff: Staff }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onBlur(e: FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim() || null;
    if (value === (staff.phone ?? null)) return;
    startTransition(async () => {
      try {
        await updateStaffPhone({ staffId: staff.id, phone: value });
        router.refresh();
      } catch {
        toast.error("Could not update phone.");
      }
    });
  }

  return (
    <Input
      key={staff.phone ?? "unset"}
      type="tel"
      defaultValue={staff.phone ?? ""}
      placeholder="+9665..."
      onBlur={onBlur}
      disabled={isPending}
      className="w-36"
    />
  );
}

export function StaffActiveToggle({ staff, isSelf }: { staff: Staff; isSelf: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      try {
        await setStaffActive({ staffId: staff.id, active: !staff.active });
        router.refresh();
      } catch {
        toast.error(
          isSelf ? "You can't deactivate your own account." : "Could not update status."
        );
      }
    });
  }

  return (
    <Button
      variant={staff.active ? "outline" : "secondary"}
      size="sm"
      onClick={toggle}
      disabled={isPending || (isSelf && staff.active)}
    >
      {staff.active ? "Active" : "Deactivated"}
    </Button>
  );
}
