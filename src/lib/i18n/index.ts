import { cookies } from "next/headers";
import { en, type Dictionary } from "./en";
import { ar } from "./ar";

export type Locale = "en" | "ar";
export const LOCALE_COOKIE = "locale";
export const LOCALES: Locale[] = ["en", "ar"];

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
}

export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

export { type Dictionary };
