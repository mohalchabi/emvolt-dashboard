"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { previewAsClient } from "@/lib/actions/clients";
import { friendlyErrorMessage } from "@/lib/friendly-error";

export function PreviewAsClientButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        await previewAsClient(clientId);
        // Full navigation, not router.push — the portal is a separate
        // session cookie/layout, and this reflects that it's effectively a
        // different "app" from the admin dashboard we're leaving.
        window.location.href = "/portal";
      } catch (err) {
        toast.error(friendlyErrorMessage(err, "Could not open the customer preview."));
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={isPending} className="gap-2">
      <Eye className="size-4" />
      {isPending ? "Opening..." : "Preview as Customer"}
    </Button>
  );
}
