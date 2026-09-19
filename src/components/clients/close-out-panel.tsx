"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionStatusMenu } from "@/components/calendar/session-status-menu";
import type { Dictionary, Locale } from "@/lib/i18n";

export type OpenSession = {
  id: string;
  status: string;
  when: string;
  clientId: string | null;
  clientName: string;
  trainerName: string;
};

/**
 * Classes whose date has passed that nobody marked as attended or missed.
 *
 * These are why a package can say sessions remain after the client has been
 * to all of them: the balance counts completed sessions, so one left as
 * scheduled holds the number up forever. Closing them out here is what makes
 * every remaining-sessions figure in the app worth trusting.
 */
export function CloseOutPanel({
  sessions,
  title,
  description,
  emptyText,
  locale,
  t,
}: {
  sessions: OpenSession[];
  title: string;
  description: string;
  emptyText: string;
  locale: Locale;
  t: Dictionary["clientDetail"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {sessions.length > 0 && (
            <Badge variant="outline" className="border-amber-500/60 tabular-nums text-amber-400">
              {sessions.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <div className="flex min-w-0 flex-col">
                {s.clientId ? (
                  <Link href={`/clients/${s.clientId}`} className="font-medium hover:underline">
                    <bdi>{s.clientName}</bdi>
                  </Link>
                ) : (
                  <span className="font-medium">
                    <bdi>{s.clientName}</bdi>
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  <bdi>{s.when}</bdi> · <bdi>{s.trainerName}</bdi>
                </span>
              </div>
              <SessionStatusMenu sessionId={s.id} status={s.status} locale={locale} t={t} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
