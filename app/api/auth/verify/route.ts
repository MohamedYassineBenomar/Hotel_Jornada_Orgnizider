/**
 * GET /api/auth/verify?token=...
 *
 * Consumes the magic-link token, sets the session cookie, and redirects to /panel.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { hashToken } from "@/lib/auth/token";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const appBase = env().NEXT_PUBLIC_APP_URL;
  if (!token) {
    return NextResponse.redirect(`${appBase}/entrar?error=missing_token`);
  }

  const hash = hashToken(token);
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hash } });
  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    return NextResponse.redirect(`${appBase}/entrar?error=invalid`);
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) {
    return NextResponse.redirect(`${appBase}/entrar?error=invalid`);
  }

  await prisma.$transaction([
    prisma.authToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  const session = await getSession();
  session.userId = user.id;
  session.restaurantId = user.restaurantId;
  session.role = "manager";
  await session.save();

  return NextResponse.redirect(`${appBase}/panel`);
}
