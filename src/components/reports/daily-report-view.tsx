import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { label, DAILY_LEAD_TARGET } from "@/lib/constants";
import { formatGymDate, formatGymTime } from "@/lib/time";
import { formatWorked } from "@/lib/attendance-summary";
import { ReportActions } from "@/components/reports/report-actions";
import type { StaffDay } from "@/lib/daily-report";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * One day, as the person who worked it would describe it.
 *
 * Laid out to survive being printed: the controls hide, and nothing depends on
 * colour to be read, because this ends up as a PDF or on paper as often as on
 * a screen.
 */
export function DailyReportView({
  day,
  t,
  common,
  locale,
}: {
  day: StaffDay;
  t: Dictionary["dailyReport"];
  common: Dictionary["attendance"];
  locale: Locale;
}) {
  const taught = day.classes.filter((c) => c.status === "completed").length;
  const text = asPlainText(day, t, locale);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t.title} — <bdi>{day.staff.name}</bdi>
          </h1>
          <p className="text-sm text-muted-foreground">
            <bdi>{formatGymDate(day.day, locale)}</bdi> · {label(day.staff.role, locale)}
          </p>
        </div>
        <ReportActions plainText={text} t={t} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.shift}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <Figure label={t.started} value={day.startedAt ? formatGymTime(day.startedAt, locale) : "—"} />
          <Figure label={t.ended} value={day.endedAt ? formatGymTime(day.endedAt, locale) : "—"} />
          <Figure
            label={t.worked}
            value={
              day.workedMinutes === null
                ? "—"
                : formatWorked(day.workedMinutes, common.hoursShort, common.minutesShort)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t.classes}</CardTitle>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t.taughtOf.replace("{done}", String(taught)).replace("{total}", String(day.classes.length))}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {day.classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noClasses}</p>
          ) : (
            day.classes.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <bdi className="tabular-nums text-muted-foreground">
                    {formatGymTime(c.at, locale)}
                  </bdi>
                  <bdi className="font-medium">{c.clientName}</bdi>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{label(c.type, locale)}</span>
                  <Badge variant={c.status === "completed" ? "default" : "outline"}>
                    {label(c.status, locale)}
                  </Badge>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t.leads}</CardTitle>
          <span className="flex items-center gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">
              {t.ofTarget
                .replace("{count}", String(day.leadsReached))
                .replace("{target}", String(DAILY_LEAD_TARGET))}
            </span>
            <Badge variant={day.metTarget ? "default" : "outline"}>
              {day.metTarget ? t.targetMet : t.targetMissed}
            </Badge>
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {day.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noLeads}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(day.outcomeCounts).map(([outcome, count]) => (
                  <Badge key={outcome} variant="secondary" className="gap-1">
                    {label(outcome, locale)}
                    <span className="tabular-nums opacity-70">{count}</span>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {day.contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <bdi className="tabular-nums text-muted-foreground">
                        {formatGymTime(c.at, locale)}
                      </bdi>
                      <bdi className="font-medium">{c.leadName}</bdi>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{label(c.method, locale)}</span>
                      <Badge variant="outline">{label(c.outcome, locale)}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.remarks}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t.whatHappened}</span>
            <p className="whitespace-pre-wrap">
              {day.remarks?.trim() || <span className="text-muted-foreground">{t.nothingWritten}</span>}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t.problems}</span>
            <p className="whitespace-pre-wrap">
              {day.issues?.trim() || <span className="text-muted-foreground">{t.noProblems}</span>}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Figure({ label: l, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{l}</span>
      <bdi className="text-lg font-semibold tabular-nums">{value}</bdi>
    </div>
  );
}

/**
 * The same report as something that can be pasted into WhatsApp.
 *
 * Built on the server so the copy button has nothing to assemble, and kept
 * plain: WhatsApp renders no tables, so everything is lines.
 */
export function asPlainText(day: StaffDay, t: Dictionary["dailyReport"], locale: Locale): string {
  const lines: string[] = [];
  lines.push(`${t.title} — ${day.staff.name}`);
  lines.push(formatGymDate(day.day, locale));
  lines.push("");
  lines.push(
    `${t.shift}: ${day.startedAt ? formatGymTime(day.startedAt, locale) : "—"} → ${
      day.endedAt ? formatGymTime(day.endedAt, locale) : "—"
    }`
  );

  const taught = day.classes.filter((c) => c.status === "completed").length;
  lines.push("");
  lines.push(`${t.classes}: ${taught}/${day.classes.length}`);
  for (const c of day.classes) {
    lines.push(`• ${formatGymTime(c.at, locale)} ${c.clientName} — ${label(c.status, locale)}`);
  }

  lines.push("");
  lines.push(
    `${t.leads}: ${day.leadsReached}/${DAILY_LEAD_TARGET}${day.metTarget ? "" : ` (${t.targetMissed})`}`
  );
  for (const c of day.contacts) {
    lines.push(`• ${c.leadName} — ${label(c.outcome, locale)}`);
  }

  if (day.remarks?.trim()) {
    lines.push("");
    lines.push(`${t.whatHappened}: ${day.remarks.trim()}`);
  }
  if (day.issues?.trim()) {
    lines.push("");
    lines.push(`${t.problems}: ${day.issues.trim()}`);
  }

  return lines.join("\n");
}
