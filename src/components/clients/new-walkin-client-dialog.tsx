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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWalkInClientSchema, type CreateWalkInClientInput } from "@/lib/schemas/client";
import { createWalkInClient } from "@/lib/actions/clients";
import { SECTIONS, CLIENT_SOURCES, PAYMENT_METHODS, label, type TrainingType } from "@/lib/constants";
import type { PackageTemplate } from "@/generated/prisma/client";
import type { Dictionary } from "@/lib/i18n";

const CUSTOM = "custom";
const DISCOUNT_RATE = 0.45;

export function NewWalkInClientDialog({
  templates,
  dict,
}: {
  templates: PackageTemplate[];
  // `dict`, not `t`: this file already uses `t` for package templates.
  dict: Dictionary["clientsPage"];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [templateChoice, setTemplateChoice] = useState<string>(CUSTOM);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [sessionType, setSessionType] = useState<TrainingType>("pt");
  const [slots, setSlots] = useState<SessionSlot[]>(emptySlots(12));
  const router = useRouter();

  const defaults = (t: PackageTemplate | null) => ({
    name: "",
    phone: "",
    email: "",
    section: "male" as const,
    source: undefined,
    templateId: t?.id ?? null,
    packageName: t?.name ?? "",
    totalSessions: t?.sessions ?? 12,
    price: t?.price ?? 0,
    priceOverrideReason: "",
    paymentMethod: undefined,
  });

  const form = useForm<z.input<typeof createWalkInClientSchema>, unknown, CreateWalkInClientInput>({
    resolver: zodResolver(createWalkInClientSchema),
    defaultValues: defaults(null),
  });

  const watchedSection = form.watch("section");
  const availableTemplates = templates.filter((t) => !t.section || t.section === watchedSection);
  const selectedTemplate = availableTemplates.find((t) => t.id === templateChoice) ?? null;

  const watchedPrice = form.watch("price");
  const watchedTotalSessions = form.watch("totalSessions");
  const priceDiffersFromTemplate = !!selectedTemplate && Number(watchedPrice) !== selectedTemplate.price;

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
    form.setValue("price", Math.round(selectedTemplate.price * (1 - DISCOUNT_RATE)), { shouldValidate: true });
    form.setValue("priceOverrideReason", "45% special offer", { shouldValidate: true });
  }

  function onTemplateChange(value: string) {
    setTemplateChoice(value);
    const t = availableTemplates.find((x) => x.id === value) ?? null;
    const current = form.getValues();
    form.reset({ ...defaults(t), name: current.name, phone: current.phone, email: current.email, section: current.section, source: current.source });
  }

  function onSectionChange(value: "male" | "female" | null) {
    if (!value) return;
    form.setValue("section", value);
    if (selectedTemplate && selectedTemplate.section && selectedTemplate.section !== value) {
      setTemplateChoice(CUSTOM);
      const current = form.getValues();
      form.reset({ ...defaults(null), name: current.name, phone: current.phone, email: current.email, section: value, source: current.source });
    }
  }

  function onSubmit(values: CreateWalkInClientInput) {
    startTransition(async () => {
      try {
        const client = await createWalkInClient({
          ...values,
          sessionType: scheduleEnabled ? sessionType : null,
          sessionDates: scheduleEnabled ? filledDatetimes(slots) : [],
        });
        toast.success("Client added.");
        setOpen(false);
        form.reset(defaults(null));
        setTemplateChoice(CUSTOM);
        setScheduleEnabled(false);
        setSlots(emptySlots(12));
        router.push(`/clients/${client.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add client.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{dict.newClient}</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dict.newClient}</DialogTitle>
          <DialogDescription>
            Sign up a walk-in who wasn&apos;t already a lead &mdash; their info, how they heard about us, and
            their first package purchase.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+9665xxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select value={field.value} onValueChange={onSectionChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue>{(v: string) => label(v)}</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How did they hear about us?</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose...">{(v: string) => label(v)}</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLIENT_SOURCES.map((s) => (
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
            </div>

            <div className="h-px bg-border" />

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
                              const t = availableTemplates.find((x) => x.id === v);
                              return t ? `${t.name} — ${t.sessions} sessions — ${t.price.toLocaleString()} SAR` : v;
                            })()
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex min-w-0 flex-col whitespace-normal py-0.5">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.sessions} sessions · {t.durationDays} days · {t.price.toLocaleString()} SAR
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>Custom package</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="packageName"
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

            <SessionDatesFields
              enabled={scheduleEnabled}
              onEnabledChange={setScheduleEnabled}
              totalSessions={Number(watchedTotalSessions) || 0}
              sessionType={sessionType}
              onSessionTypeChange={setSessionType}
              slots={slots}
              onSlotsChange={setSlots}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid via</FormLabel>
                  <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose...">{(v: string) => label(v)}</SelectValue>
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

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || (priceDiffersFromTemplate && !form.watch("priceOverrideReason")?.trim())}
              >
                {isPending ? "Adding..." : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
