"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPackageTemplateSchema,
  type CreatePackageTemplateInput,
} from "@/lib/schemas/package-template";
import { createPackageTemplate } from "@/lib/actions/package-templates";
import { SECTIONS, label } from "@/lib/constants";

const BOTH = "both";

const defaultValues = { name: "", sessions: 8, durationDays: 30, price: 0, section: null };

export function NewPackageTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<z.input<typeof createPackageTemplateSchema>, unknown, CreatePackageTemplateInput>({
    resolver: zodResolver(createPackageTemplateSchema),
    defaultValues,
  });

  function onSubmit(values: CreatePackageTemplateInput) {
    startTransition(async () => {
      try {
        await createPackageTemplate(values);
        setOpen(false);
        form.reset(defaultValues);
        router.refresh();
        toast.success("Package type added.");
      } catch {
        toast.error("Could not add package type.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New Package Type</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Package Type</DialogTitle>
          <DialogDescription>
            Add a tier to the catalog staff pick from when selling a package (e.g. Standard — 12
            sessions).
          </DialogDescription>
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
                    <Input placeholder="e.g. Standard, Platinum, Pilates - Women" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="sessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sessions</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (SAR)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applies to</FormLabel>
                  <Select
                    value={field.value ?? BOTH}
                    onValueChange={(v) => field.onChange(v === BOTH ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(v: string) => (v === BOTH ? "Both sections" : label(v))}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={BOTH}>Both sections</SelectItem>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {label(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding..." : "Add Package Type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
