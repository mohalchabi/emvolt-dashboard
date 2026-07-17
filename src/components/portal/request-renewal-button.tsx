"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestPackageRenewal } from "@/lib/actions/portal";

export function RequestRenewalButton({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        await requestPackageRenewal(packageId);
        toast.success("Renewal requested — the studio will follow up.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not request a renewal.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={isPending}>
      {isPending ? "Requesting..." : "Request Renewal"}
    </Button>
  );
}
