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
import { createPackageSchema, type CreatePackageInput } from "@/lib/schemas/client";
import { createPackage } from "@/lib/actions/clients";
import type { PackageTemplate } from "@/generated/prisma/client";

const CUSTOM = "custom";
const DISCOUNT_RATE = 0.45;

export function NewPackageDialog({
  clientId,
  templates,
}: {
  clientId: string;
  templates: PackageTemplate[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [templateChoice, setTemplateChoice] = useState<string>(templates[0]?.id ?? CUSTOM);
  const router = useRouter();

  const selectedTemplate = templates.find((t) => t.id === templateChoice) ?? null;

  const form = useForm<z.input<typeof createPackageSchema>, unknown, CreatePackageInput>({
    resolver: zodResolver(createPackageSchema),
    defaultValues: {
      clientId,
      templateId: selectedTemplate?.id ?? null,
      name: selectedTemplate?.name ?? "",
      totalSessions: selectedTemplate?.sessions ?? 12,
      price: selectedTemplate?.price ?? 0,
      priceOverrideReason: "",
      expiryDate: null,
    },
  });

  const watchedPrice = form.watch("price");
  const priceDiffersFromTemplate =
    !!selectedTemplate && Number(watchedPrice) !== selectedTemplate.price;

  function applyDiscount() {
    if (!selectedTemplate) return;
    form.setValue("price", Math.round(selectedTemplate.price * (1 - DISCOUNT_RATE)), {
      shouldValidate: true,
    });
    form.setValue("priceOverrideReason", "45% special offer", { shouldValidate: true });
  }

  function onTemplateChange(value: string) {
    setTemplateChoice(value);
    const t = templates.find((x) => x.id === value) ?? null;
    form.reset({
      clientId,
      templateId: t?.id ?? null,
      name: t?.name ?? "",
      totalSessions: t?.sessions ?? 12,
      price: t?.price ?? 0,
      priceOverrideReason: "",
      expiryDate: null,
    });
  }

  function onSubmit(values: CreatePackageInput) {
    startTransition(async () => {
      try {
        await createPackage({ ...values, clientId });
        setOpen(false);
        onTemplateChange(templates[0]?.id ?? CUSTOM);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add package.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary">Add Package</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Package</DialogTitle>
          <DialogDescription>Record a new session package purchase for this client.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormItem>
              <FormLabel>Package type</FormLabel>
              <Select value={templateChoice} onValueChange={(v) => v && onTemplateChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) =>
                        v === CUSTOM
                          ? "Custom package"
                          : (() => {
                              const t = templates.find((x) => x.id === v);
                              return t ? `${t.name} — ${t.sessions} sessions — ${t.price.toLocaleString()} SAR` : v;
                            })()
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.sessions} sessions — {t.durationDays} days — {t.price.toLocaleString()} SAR
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>Custom package</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12-Session EMS Pack" {...field} disabled={!!selectedTemplate} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="totalSessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total sessions</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} value={field.value as number} disabled={!!selectedTemplate} />
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

            {selectedTemplate && (
              <Button type="button" variant="outline" size="sm" onClick={applyDiscount} className="self-start">
                Apply 45% Off ({Math.round(selectedTemplate.price * (1 - DISCOUNT_RATE)).toLocaleString()} SAR)
              </Button>
            )}

            {priceDiffersFromTemplate && (
              <FormField
                control={form.control}
                name="priceOverrideReason"
                rules={{ required: true }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for price change</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Summer offer, referral discount..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Required — the listed price for {selectedTemplate?.name} is{" "}
                      {selectedTemplate?.price.toLocaleString()} SAR.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedTemplate ? (
              <p className="text-xs text-muted-foreground">
                Sessions must be used within {selectedTemplate.durationDays} days of purchase — the
                expiry date is set automatically.
              </p>
            ) : (
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || (priceDiffersFromTemplate && !form.watch("priceOverrideReason")?.trim())}
              >
                {isPending ? "Adding..." : "Add Package"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
