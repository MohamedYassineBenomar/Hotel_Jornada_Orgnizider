/**
 * Magic-link token generation, hashing, and verification.
 *
 * - Plaintext goes in the email URL.
 * - Only SHA-256 hash is stored in the DB (`AuthToken.tokenHash`).
 * - Tokens expire after `MAGIC_LINK_TTL_MINUTES` and can be consumed once.
 */

import { createHash } from "node:crypto";
import { nanoid } from "nanoid";

import { MAGIC_LINK_TTL_MINUTES } from "@/lib/constants";

/** Generate a new (plaintext, hash, expiresAt) triple. */
export function newMagicToken(): {
  plaintext: string;
  hash: string;
  expiresAt: Date;
} {
  const plaintext = nanoid(32);
  return {
    plaintext,
    hash: hashToken(plaintext),
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000),
  };
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
