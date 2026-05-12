/**
 * POST /api/auth/request
 *   { email } → 204
 *
 *  - Look up or create the User.
 *  - Generate magic token (plaintext + hash).
 *  - Email the link via Resend.
 *  - Respond 204 regardless of whether the email exists (no user enumeration).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";

import { handler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { newMagicToken } from "@/lib/auth/token";
import { renderMagicLinkEmail } from "@/lib/email/magic-link";
import { fromAddress, resend } from "@/lib/email/resend";
import { env } from "@/lib/env";

const BodySchema = z.object({
  email: z.string().email(),
});

export const POST = handler(
  { auth: false, body: BodySchema },
  async ({ body }) => {
    const email = body!.email.trim().toLowerCase();

    // Singleton restaurant for v1. Reuse the one created by seed; if missing,
    // self-heal with a sensible default.
    const restaurant =
      (await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await prisma.restaurant.create({
        data: { name: "Hotel Restaurante Barcelona" },
      }));

    const user = await prisma.user.upsert({
      where: { email },
      update: { restaurantId: restaurant.id },
      create: {
        email,
        restaurantId: restaurant.id,
        role: "manager",
      },
    });

    // Clean up expired tokens for this user.
    await prisma.authToken.deleteMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null } }],
      },
    });

    const { plaintext, hash, expiresAt } = newMagicToken();
    await prisma.authToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt,
      },
    });

    const url = `${env().NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${encodeURIComponent(plaintext)}`;
    const { subject, html, text } = renderMagicLinkEmail({ url, email });

    try {
      await resend().emails.send({
        from: fromAddress(),
        to: email,
        subject,
        html,
        text,
      });
    } catch (err) {
      // We still respond 204 — but log so support can trace.
      // eslint-disable-next-line no-console
      console.error("[auth/request] resend send failed", err);
    }

    return new NextResponse(null, { status: 204 });
  },
);
