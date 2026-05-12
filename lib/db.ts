import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton, safe for both serverless and dev hot-reload.
 *
 * The schema URLs are read by the Prisma runtime from `process.env` only when
 * the client actually opens a connection — so this module is safe to import at
 * build time even when the env is missing.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
