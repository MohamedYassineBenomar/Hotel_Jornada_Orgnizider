/**
 * ISO 8601 week helpers, scoped to the restaurant timezone (Europe/Madrid).
 *
 * A week is identified by an (isoYear, isoWeek) pair where:
 *  - week starts Monday
 *  - week 1 is the week containing the first Thursday of the year
 *
 * We never expose ambient Date math to the rest of the app — every call goes
 * through these helpers so DST shifts and timezone drift can't cause
 * off-by-one bugs in the week-grid.
 */

import {
  addDays,
  startOfISOWeek,
  endOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  setISOWeekYear,
  startOfDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { MADRID_TZ } from "./madrid";

export interface IsoWeekKey {
  isoYear: number;
  isoWeek: number;
}

/** Return ISO year+week for a given UTC instant, interpreted in Madrid. */
export function isoWeekKeyForDate(date: Date): IsoWeekKey {
  const zoned = toZonedTime(date, MADRID_TZ);
  return {
    isoYear: getISOWeekYear(zoned),
    isoWeek: getISOWeek(zoned),
  };
}

/** Current ISO week, in Madrid time. */
export function currentIsoWeekKey(): IsoWeekKey {
  return isoWeekKeyForDate(new Date());
}

/** Build a Date pointing at Monday 00:00 (Madrid) of the given ISO week. */
export function isoWeekStart({ isoYear, isoWeek }: IsoWeekKey): Date {
  // Anchor on Jan 4: by ISO definition the week containing Jan 4 is week 1.
  let cursor = new Date(Date.UTC(isoYear, 0, 4));
  cursor = setISOWeekYear(cursor, isoYear);
  cursor = setISOWeek(cursor, isoWeek);
  cursor = startOfISOWeek(cursor);
  return startOfDay(cursor);
}

/** Sunday 23:59 of the given ISO week (Madrid). */
export function isoWeekEnd(key: IsoWeekKey): Date {
  return endOfISOWeek(isoWeekStart(key));
}

/** The 7 dates (Mon..Sun) that make up an ISO week, midnight Madrid. */
export function isoWeekDates(key: IsoWeekKey): Date[] {
  const monday = isoWeekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** isoWeekKey for the week N steps before/after the given one. */
export function isoWeekShift(key: IsoWeekKey, weeks: number): IsoWeekKey {
  const anchor = addDays(isoWeekStart(key), weeks * 7);
  return {
    isoYear: getISOWeekYear(anchor),
    isoWeek: getISOWeek(anchor),
  };
}

/** Canonical "YYYY-Www" identifier (e.g. "2026-W19"). */
export function formatIsoWeekKey({ isoYear, isoWeek }: IsoWeekKey): string {
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

/** Parse "YYYY-Www" back into an IsoWeekKey. */
export function parseIsoWeekKey(s: string): IsoWeekKey {
  const m = /^(\d{4})-W(\d{2})$/.exec(s);
  if (!m) throw new Error(`Invalid ISO week key: ${s}`);
  const isoYear = Number(m[1]);
  const isoWeek = Number(m[2]);
  if (isoWeek < 1 || isoWeek > 53) {
    throw new Error(`ISO week out of range: ${s}`);
  }
  return { isoYear, isoWeek };
}

/** ISO weekday number 1..7 (Mon..Sun) for a JS Date in Madrid time. */
export function isoWeekdayOf(date: Date): number {
  // date-fns getISODay returns 1..7
  // Use Madrid time so DST doesn't trip us at midnight.
  const zoned = toZonedTime(date, MADRID_TZ);
  const day = zoned.getDay();
  return day === 0 ? 7 : day;
}
