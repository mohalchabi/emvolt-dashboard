"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  SessionDatesFields,
  emptySlots,
  filledDatetimes,
  type SessionSlot,
} from "@/components/clients/session-dates-fields";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { PAYMENT_METHODS, label, type TrainingType } from "@/lib/constants";
import type { PackageTemplate } from "@/generated/prisma/client";
import type { Dictionary } from "@/lib/i18n";

const CUSTOM = "custom";
const DISCOUNT_RATE = 0.45;

export function NewPackageDialog({
  clientId,
  templates,
  dict,
  hasExistingPackages,
}: {
  clientId: string;
  templates: PackageTemplate[];
  // Named `dict` rather than `t` because `t` is already the loop variable for
  // package templates further down this file.
  dict: Dictionary["clientDetail"];
  /** Pre-ticks "this is a renewal" — the usual case for a returning client. */
  hasExistingPackages: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [templateChoice, setTemplateChoice] = useState<string>(templates[0]?.id ?? CUSTOM);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [sessionType, setSessionType] = useState<TrainingType>("pt");
  const [slots, setSlots] = useState<SessionSlot[]>(emptySlots(templates[0]?.sessions ?? 12));
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
      paymentMethod: null,
      isRenewal: hasExistingPackages,
    },
  });

  const watchedPrice = form.watch("price");
  const watchedTotalSessions = form.watch("totalSessions");
  const priceDiffersFromTemplate =
    !!selectedTemplate && Number(watchedPrice) !== selectedTemplate.price;

  useEffect(() => {
    const n = Number(watchedTotalSessions) || 0;
    setSlots((prev) => {
      if (n === prev.length) return prev;
      if (n < prev.length) return prev.slice(0, n);
      return [...prev, ...emptySlots(n - prev.length)];
    });
  }, [watchedTotalSessions]);

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
      paymentMethod: form.getValues("paymentMethod"),
      // Switching package type shouldn't silently un-tick the renewal.
      isRenewal: form.getValues("isRenewal"),
    });
  }

  function onSubmit(values: CreatePackageInput) {
    startTransition(async () => {
      try {
        await createPackage({
          ...values,
          clientId,
          sessionType: scheduleEnabled ? sessionType : null,
          sessionDates: scheduleEnabled ? filledDatetimes(slots) : [],
        });
        setOpen(false);
        onTemplateChange(templates[0]?.id ?? CUSTOM);
        setScheduleEnabled(false);
        setSlots(emptySlots(templates[0]?.sessions ?? 12));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : dict.couldNotAddPackage);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary">{dict.addPackage}</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dict.addPackage}</DialogTitle>
          <DialogDescription>{dict.addPackageDesc}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormItem>
              <FormLabel>{dict.packageType}</FormLabel>
              <Select value={templateChoice} onValueChange={(v) => v && onTemplateChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) =>
                        v === CUSTOM
                          ? dict.customPackage
                          : (() => {
                              const t = templates.find((x) => x.id === v);
                              return t ? `${t.name} — ${t.sessions} ${dict.sessionsWord} — ${t.price.toLocaleString()} ${dict.sarWord}` : v;
                            })()
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex min-w-0 flex-col whitespace-normal py-0.5">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.sessions} {dict.sessionsWord} · {t.durationDays} {dict.daysWord} · {t.price.toLocaleString()} {dict.sarWord}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>{dict.customPackage}</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.packageName}</FormLabel>
                  <FormControl>
                    <Input placeholder={dict.packageNamePlaceholder} {...field} disabled={!!selectedTemplate} />
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
                    <FormLabel>{dict.totalSessions}</FormLabel>
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
                    <FormLabel>{dict.price}</FormLabel>
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
                {dict.applyDiscount} ({Math.round(selectedTemplate.price * (1 - DISCOUNT_RATE)).toLocaleString()} {dict.sarWord})
              </Button>
            )}

            {priceDiffersFromTemplate && (
              <FormField
                control={form.control}
                name="priceOverrideReason"
                rules={{ required: true }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.priceReason}</FormLabel>
                    <FormControl>
                      <Input placeholder={dict.priceReasonPlaceholder} {...field} value={field.value ?? ""} />
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
                {dict.expiryAutoHint.replace("{days}", String(selectedTemplate.durationDays))}
              </p>
            ) : (
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.expiryDate}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.paidViaOptional}</FormLabel>
                  <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={dict.choose}>{(v: string) => label(v)}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {label(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pre-ticked when the client already holds a package, since that's
                the common case — staff untick it for a genuinely separate
                purchase (a class pass alongside a PT block). */}
            <FormField
              control={form.control}
              name="isRenewal"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <FormControl>
                      <Checkbox
                        id="pkg-is-renewal"
                        checked={!!field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <div className="flex flex-col gap-0.5">
                      <FormLabel htmlFor="pkg-is-renewal" className="cursor-pointer">
                        {dict.isRenewal}
                      </FormLabel>
                      <span className="text-xs text-muted-foreground">{dict.isRenewalHint}</span>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SessionDatesFields
              labels={{ scheduleNow: dict.scheduleNow, sessionType: dict.sessionTypeLabel }}
              enabled={scheduleEnabled}
              onEnabledChange={setScheduleEnabled}
              totalSessions={Number(watchedTotalSessions) || 0}
              sessionType={sessionType}
              onSessionTypeChange={setSessionType}
              slots={slots}
              onSlotsChange={setSlots}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || (priceDiffersFromTemplate && !form.watch("priceOverrideReason")?.trim())}
              >
                {isPending ? dict.addingPackage : dict.addPackage}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
