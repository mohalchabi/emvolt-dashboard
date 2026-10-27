"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * Light and dark, switchable.
 *
 * The brand is dark and stays the default — the studio's own site is near
 * black — but the app gets used on a phone in a bright room and at a reception
 * desk under a window, where dark is the harder read.
 *
 * `attribute="class"` is what Tailwind's `dark` variant already keys off, and
 * the system preference is deliberately ignored: staff share these devices,
 * and a dashboard that changes colour because the phone slipped into night
 * mode looks broken rather than considerate. The choice is theirs and it sticks.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
