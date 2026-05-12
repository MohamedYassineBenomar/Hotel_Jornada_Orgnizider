/**
 * Minutes-since-midnight helpers. Pure integer math, no Date objects.
 */

/** Parse "HH:MM" into minutes-since-midnight. Throws on invalid input. */
export function parseHmToMinutes(hm: string): number {
  const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(hm);
  if (!m) throw new Error(`Invalid time string: ${hm}`);
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 24 || mm < 0 || mm > 59) {
    throw new Error(`Invalid time string: ${hm}`);
  }
  return h * 60 + mm;
}

/** Format minutes-since-midnight to "HH:MM". 1440 → "24:00". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Inclusive minutes count between two minute marks. */
export function minutesBetween(start: number, end: number): number {
  return Math.max(0, end - start);
}

/** Hours (float) between two minute marks. */
export function hoursBetween(start: number, end: number): number {
  return minutesBetween(start, end) / 60;
}

/** Check if two [start,end) intervals overlap. End is exclusive. */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
