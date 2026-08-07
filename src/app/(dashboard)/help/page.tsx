import { getDictionary } from "@/lib/i18n";
import { label } from "@/lib/constants";
import { TUTORIALS, CHAPTER_NUMERALS } from "@/lib/tutorials";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "How to use — EmVolt Dashboard",
};

export default async function HelpPage() {
  const { locale, t } = await getDictionary();
  const c = t.tutorials;
  const numerals = CHAPTER_NUMERALS[locale];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
        <p className="text-sm text-muted-foreground">{c.silentNote}</p>
      </div>

      {TUTORIALS.map((tutorial, index) => {
        const chapter = c.chapters[tutorial.key];
        // Only the sessions chapter carries a warning, so this stays a
        // narrowing check rather than an optional field on every chapter.
        const warn = "warn" in chapter ? chapter.warn : null;

        return (
          <Card key={tutorial.key} className="overflow-hidden p-0">
            <div className="flex items-start gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-bold text-primary"
              >
                {numerals[index]}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="font-heading text-lg font-semibold leading-snug tracking-tight">
                  {chapter.title}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{c.audienceLabel}</span>
                  {tutorial.audience.map((role) => (
                    <Badge key={role} variant="secondary" className="text-[10px]">
                      {label(role, locale)}
                    </Badge>
                  ))}
                  <span aria-hidden="true" className="opacity-50">
                    ·
                  </span>
                  <span>
                    {chapter.duration} {c.minutes}
                  </span>
                </div>
              </div>
            </div>

            <video
              controls
              playsInline
              preload="none"
              poster={tutorial.poster}
              aria-label={chapter.title}
              className="w-full bg-black"
            >
              <source src={tutorial.video} type="video/mp4" />
            </video>

            <CardContent className="flex flex-col gap-2 p-4 pt-4 sm:p-5">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">
                {c.summaryLabel}
              </h3>
              <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm marker:text-primary">
                {chapter.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
              {warn && (
                <p className="mt-1 rounded-md border-s-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
                  <span className="font-bold text-destructive">{c.warnLabel}</span>{" "}
                  {warn}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-muted/40">
        <CardContent className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-semibold">{c.rulesTitle}</h2>
          <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-sm marker:font-bold marker:text-primary">
            {c.rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">{c.demoNote}</p>
    </div>
  );
}
