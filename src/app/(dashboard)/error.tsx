"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Server Actions are keyed by a build-specific ID that Next.js rotates on
// every deploy. A tab left open across a deploy calls an action ID the new
// server no longer has, which throws well before it ever reaches our own
// code — so no toast/try-catch in a page component can catch or explain it.
// This boundary is the backstop: instead of Next.js's raw/generic crash
// screen, reloading (which fetches the current build) is what actually
// resolves it, so that's the action we offer.
export default function DashboardError({
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
            This can happen right after the app is updated. Reloading the page almost always fixes
            it — if it keeps happening, contact the admin.
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
