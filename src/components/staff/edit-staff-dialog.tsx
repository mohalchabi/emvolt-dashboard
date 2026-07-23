"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateStaffDetailsSchema, type UpdateStaffDetailsInput } from "@/lib/schemas/staff";
import { updateStaffDetails } from "@/lib/actions/staff";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import type { Staff } from "@/generated/prisma/client";

export function EditStaffDialog({ staff }: { staff: Staff }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<UpdateStaffDetailsInput>({
    resolver: zodResolver(updateStaffDetailsSchema),
    defaultValues: { staffId: staff.id, name: staff.name, email: staff.email },
  });

  function onSubmit(values: UpdateStaffDetailsInput) {
    startTransition(async () => {
      try {
        await updateStaffDetails(values);
        setOpen(false);
        router.refresh();
        toast.success("Staff details updated.");
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not update staff — email may already be in use."));
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset({ staffId: staff.id, name: staff.name, email: staff.email });
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Edit staff">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Staff</DialogTitle>
          <DialogDescription>Update this staff member&apos;s name or email.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@emvolt.sa" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Changing this changes which Google account can sign in as them.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
