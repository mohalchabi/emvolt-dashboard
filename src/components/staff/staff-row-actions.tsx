"use client";

import { useState, useTransition, type FocusEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAFF_ROLES, SECTIONS, label } from "@/lib/constants";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import {
  updateStaffRole,
  updateStaffSection,
  updateStaffTarget,
  updateStaffPhone,
  deleteStaff,
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
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not update role."));
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
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not update section."));
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
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not update target."));
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
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not update phone."));
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

export function StaffDeleteButton({ staff, isSelf }: { staff: Staff; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  // Set only when a delete attempt was blocked because the staff member has
  // real history attached — switches the dialog to offering the one action
  // that actually works (deactivate) instead of leaving admins at a dead end.
  const [blocked, setBlocked] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onConfirmDelete() {
    startTransition(async () => {
      try {
        await deleteStaff({ staffId: staff.id });
        setOpen(false);
        router.refresh();
        toast.success(`${staff.name} deleted.`);
      } catch (err) {
        if (err instanceof Error && err.message.includes("deactivate them instead")) {
          setBlocked(true);
        } else {
          toast.error(friendlyErrorMessage(err, "Could not delete staff member."));
        }
      }
    });
  }

  function onDeactivateInstead() {
    startTransition(async () => {
      try {
        await setStaffActive({ staffId: staff.id, active: false });
        setOpen(false);
        router.refresh();
        toast.success(`${staff.name} deactivated.`);
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not deactivate staff member."));
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setBlocked(false);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Delete staff" disabled={isSelf}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        {blocked ? (
          <>
            <DialogHeader>
              <DialogTitle>Can&apos;t delete {staff.name}</DialogTitle>
              <DialogDescription>
                They have existing leads, clients, sessions, or activity on record, so deleting
                would destroy that history. Deactivating blocks their sign-in immediately without
                losing it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={onDeactivateInstead} disabled={isPending}>
                {isPending ? "Deactivating..." : "Deactivate Instead"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Delete {staff.name}?</DialogTitle>
              <DialogDescription>
                This permanently removes them from the sign-in allow-list. Only possible if they
                have no leads, clients, sessions, or activity on record — if they do, you&apos;ll
                get the option to deactivate instead.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onConfirmDelete} disabled={isPending}>
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
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
      } catch (err) {
        toast.error(
          friendlyErrorMessage(
            err,
            isSelf ? "You can't deactivate your own account." : "Could not update status."
          )
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
