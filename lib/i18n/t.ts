/**
 * Translation helpers. Two flavors:
 *
 *  - `tFromDictionary(dict, key, vars)` — pure function for server components
 *    that already have a dictionary loaded.
 *  - `createT(dict)` — returns a bound `t(key, vars)` curried for
 *    convenience in JSX.
 *
 * Missing keys return the key itself so dev sees the bare key in the UI
 * rather than `undefined`.
 */

import type { Dictionary } from "./dictionary";

export function tFromDictionary(
  dict: Dictionary,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = dict[key];
  if (raw === undefined) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function createT(dict: Dictionary): TFn {
  return (key, vars) => tFromDictionary(dict, key, vars);
}
