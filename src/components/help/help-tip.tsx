"use client";

import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * A "?" next to a heading or control that explains, in the staff member's own
 * language, what the thing is for and what they're expected to do with it.
 *
 * The copy is passed in from the page rather than looked up here, so it comes
 * from the same dictionary as the rest of the page and follows the locale the
 * user picked. `steps` renders as a numbered list for anything procedural.
 */
export function HelpTip({
  title,
  body,
  steps,
  label = "What is this?",
}: {
  title: string;
  body: string;
  steps?: string[];
  label?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        }
      >
        <HelpCircle className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{body}</PopoverDescription>
        </PopoverHeader>
        {steps && steps.length > 0 && (
          <ol className="flex list-decimal flex-col gap-1 ps-4 text-sm text-muted-foreground">
            {steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        )}
      </PopoverContent>
    </Popover>
  );
}
