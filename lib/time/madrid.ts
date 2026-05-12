/**
 * Europe/Madrid timezone helpers. All UI formatters MUST go through here so
 * the grid renders the same on a US laptop, a Spanish phone, and a Vercel
 * function in Frankfurt.
 */

import { format } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const MADRID_TZ = "Europe/Madrid";

/** Format a JS Date in Madrid time using date-fns pattern syntax. */
export function formatMadrid(date: Date, pattern: string): string {
  return formatInTimeZone(date, MADRID_TZ, pattern);
}

/** Date → "yyyy-MM-dd" in Madrid timezone (used as URL/Prisma date key). */
export function toMadridDateKey(date: Date): string {
  return formatInTimeZone(date, MADRID_TZ, "yyyy-MM-dd");
}

/** Parse "yyyy-MM-dd" as a midnight-Madrid Date (UTC instant). */
export function fromMadridDateKey(key: string): Date {
  // We construct an ISO with no Z and let toZonedTime infer Madrid offset.
  // The resulting UTC instant corresponds to Madrid midnight on that date.
  const naive = new Date(`${key}T00:00:00`);
  return toZonedTime(naive, MADRID_TZ);
}

/** Human-friendly Spanish weekday short label (Lun..Dom). */
export function madridWeekdayShortEs(date: Date): string {
  const idx = Number(formatInTimeZone(date, MADRID_TZ, "i")); // 1..7 ISO
  const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  return labels[idx - 1] ?? "";
}

/** Lossless Date → display string in Madrid; e.g. "12 may". */
export function madridDayLabel(date: Date): string {
  return formatInTimeZone(date, MADRID_TZ, "d MMM");
}

/** Identity helper for unit tests / scripts. */
export function nowMadridDate(): Date {
  return toZonedTime(new Date(), MADRID_TZ);
}

/** Local Date constructor used by the iso-week module. */
export function pureFormat(date: Date, pattern: string): string {
  return format(date, pattern);
}
