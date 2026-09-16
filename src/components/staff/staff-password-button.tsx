"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import { setStaffPassword, clearStaffPassword } from "@/lib/actions/staff";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import type { Staff } from "@/generated/prisma/client";

/**
 * Gives a staff member a password, for an address Google can't serve.
 *
 * It's shown once, here, and never again: only the hash is stored, so an admin
 * who loses it sets a new one rather than looking the old one up.
 */
export function StaffPasswordButton({ staff }: { staff: Staff & { passwordHash: string | null } }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasPassword = staff.passwordHash !== null;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  function onSave() {
    startTransition(async () => {
      try {
        await setStaffPassword({ staffId: staff.id, password });
        setOpen(false);
        setPassword("");
        router.refresh();
        toast.success(`Password set for ${staff.name}. Give it to them now — it isn't shown again.`);
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not set the password."));
      }
    });
  }

  function onClear() {
    startTransition(async () => {
      try {
        await clearStaffPassword({ staffId: staff.id });
        setOpen(false);
        router.refresh();
        toast.success(`${staff.name} can now only sign in with Google.`);
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not remove the password."));
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPassword("");
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={hasPassword ? "Change password" : "Set a password"}
            title={hasPassword ? "Signs in with a password" : "Set a password"}
            className={hasPassword ? "px-1.5 text-primary" : "px-1.5 text-muted-foreground"}
          >
            <KeyRound className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {hasPassword ? `Change ${staff.name}'s password` : `Set a password for ${staff.name}`}
          </DialogTitle>
          <DialogDescription>
            For staff who can&apos;t sign in with Google. They&apos;ll use{" "}
            <bdi className="font-medium">{staff.email}</bdi> and this password. Nobody can read it
            back afterwards, so hand it over before you close this.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`password-${staff.id}`}>New password</Label>
          <Input
            id={`password-${staff.id}`}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            dir="ltr"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          />
          <p className="text-xs text-muted-foreground">
            {tooShort
              ? `${MIN_PASSWORD_LENGTH - password.length} more character${
                  MIN_PASSWORD_LENGTH - password.length === 1 ? "" : "s"
                } needed.`
              : "Length is what makes a password hard to guess. A few unrelated words works well."}
          </p>
        </div>

        <DialogFooter>
          {hasPassword && (
            <Button variant="outline" onClick={onClear} disabled={isPending} className="me-auto">
              Remove password
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending || password.length < MIN_PASSWORD_LENGTH}
          >
            {isPending ? "Saving..." : "Save password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
