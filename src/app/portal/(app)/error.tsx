"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// See src/app/(dashboard)/error.tsx for why this exists — same backstop for
// the customer portal's own route segment.
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <Card className="max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="font-medium">Something went wrong.</p>
          <p className="text-sm text-muted-foreground">
            Reloading the page usually fixes this. If it keeps happening, contact the studio.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-1 gap-2">
            <RefreshCw className="size-4" />
            Reload page
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            Try again without reloading
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
