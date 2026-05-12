/**
 * Dynamic dictionary loader.
 *
 * Each locale's translations live as a JSON file under `messages/`. We
 * dynamically import them so adding `en.json` later doesn't require code
 * edits, just a new file and an entry in `LOCALES`.
 */

import type { Locale } from "./config";

export type Dictionary = Record<string, string>;

const cache = new Map<Locale, Dictionary>();

export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  const cached = cache.get(locale);
  if (cached) return cached;

  // Dynamic import; JSON modules are first-class in Next.
  const mod = (await import(`@/messages/${locale}.json`)) as {
    default: Dictionary;
  };
  cache.set(locale, mod.default);
  return mod.default;
}
