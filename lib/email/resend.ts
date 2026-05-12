/**
 * Resend client singleton. Reads env lazily so the build step doesn't blow up.
 */

import { Resend } from "resend";

import { env } from "@/lib/env";

let cached: Resend | null = null;

export function resend(): Resend {
  if (!cached) {
    cached = new Resend(env().RESEND_API_KEY);
  }
  return cached;
}

export function fromAddress(): string {
  return env().RESEND_FROM_EMAIL;
}
