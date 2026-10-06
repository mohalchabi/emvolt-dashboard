import { formatGymDate, GYM_TIME_ZONE } from "@/lib/time";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * The line at the top of someone's home screen.
 *
 * Greets by the hour at the gym rather than on the server, which runs on UTC
 * and would wish a morning shift good evening. The date is here because the
 * first thing front desk do is clock in, and seeing the day confirms they are
 * clocking in against the one they think they are.
 */
export function HomeGreeting({
  name,
  subtitle,
  t,
  locale,
}: {
  name: string;
  subtitle: string;
  t: Dictionary["homeActions"];
  locale: Locale;
}) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: GYM_TIME_ZONE,
    }).format(new Date())
  );

  const greeting = hour < 12 ? t.goodMorning : hour < 17 ? t.goodAfternoon : t.goodEvening;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">
        <bdi>{formatGymDate(new Date(), locale)}</bdi>
      </p>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {greeting}, <bdi>{name}</bdi>
      </h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
