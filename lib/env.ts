/**
 * Fail-fast env var loader.
 *
 * IMPORTANT: We read env vars lazily inside accessor functions instead of at
 * module init. Next 15 evaluates server modules during `next build`, when the
 * production env is intentionally absent. Lazy access lets the build complete
 * and only throws at request time if a value is missing.
 */

import { z } from "zod";

const RequiredString = z.string().min(1, "missing");

const schemaShape = {
  DATABASE_URL: RequiredString,
  DIRECT_URL: RequiredString,
  RESEND_API_KEY: RequiredString,
  RESEND_FROM_EMAIL: RequiredString,
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be ≥32 chars"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
} as const;

const envSchema = z.object(schemaShape);

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function readEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Strict accessor for server-only env. Throws at first call without env. */
export function env(): Env {
  return readEnv();
}

/** Safe optional accessor — returns undefined if env is missing (build time). */
export function tryEnv(): Env | null {
  try {
    return readEnv();
  } catch {
    return null;
  }
}
