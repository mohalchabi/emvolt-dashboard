import type { StaffRole } from "@/lib/constants";

export type TutorialKey =
  | "leads"
  | "sessions"
  | "newClient"
  | "followUp"
  | "pettyCash"
  | "renewal";

export type Tutorial = {
  key: TutorialKey;
  video: string;
  poster: string;
  /**
   * Who the chapter is really aimed at. This only drives the badge on the card —
   * every role can watch every chapter, since front desk and trainers regularly
   * cover for each other.
   */
  audience: StaffRole[];
};

/**
 * Screen recordings of the four things staff do daily. They live in `public/`
 * rather than blob storage so they ship with the deploy and keep working
 * offline once cached — nobody has to be online at the gym to re-watch one.
 *
 * The recordings are silent with Arabic captions burned in, so the English
 * dictionary flags that up rather than pretending there's an English version.
 */
export const TUTORIALS: Tutorial[] = [
  {
    key: "leads",
    video: "/tutorials/leads.mp4",
    poster: "/tutorials/leads.jpg",
    audience: ["front_desk", "trainer"],
  },
  {
    key: "sessions",
    video: "/tutorials/sessions.mp4",
    poster: "/tutorials/sessions.jpg",
    audience: ["front_desk", "trainer"],
  },
  {
    key: "newClient",
    video: "/tutorials/new-client.mp4",
    poster: "/tutorials/new-client.jpg",
    audience: ["front_desk"],
  },
  {
    key: "followUp",
    video: "/tutorials/follow-up.mp4",
    poster: "/tutorials/follow-up.jpg",
    audience: ["trainer"],
  },
  {
    key: "pettyCash",
    video: "/tutorials/petty-cash.mp4",
    poster: "/tutorials/petty-cash.jpg",
    audience: ["trainer", "front_desk"],
  },
  {
    key: "renewal",
    video: "/tutorials/renewal.mp4",
    poster: "/tutorials/renewal.jpg",
    audience: ["trainer", "front_desk"],
  },
];

/**
 * Chapter numbers are written out per locale rather than formatted at runtime,
 * so the Arabic page shows the same ١-٤ numerals burned into the recordings
 * regardless of how much ICU data the server was built with.
 */
export const CHAPTER_NUMERALS: Record<"en" | "ar", string[]> = {
  en: ["1", "2", "3", "4", "5", "6"],
  ar: ["١", "٢", "٣", "٤", "٥", "٦"],
};
