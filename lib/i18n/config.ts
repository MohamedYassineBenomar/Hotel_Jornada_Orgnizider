/**
 * Locale config. v1 ships only `es-ES`; an EN slot is reserved for v2.
 */

export const LOCALES = ["es-ES"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es-ES";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
