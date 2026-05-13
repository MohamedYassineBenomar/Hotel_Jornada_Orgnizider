/**
 * POST /api/auth/demo → 204
 *
 * Signs in immediately as the seeded `demo@jornada.local` manager with no
 * magic-link round-trip. Lets the app be tried (and the live URL be shared)
 * without a verified Resend sender.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const DEMO_EMAIL = "demo@jornada.local";

export async function POST(): Promise<Response> {
  const restaurant =
    (await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.restaurant.create({
      data: { name: "Hotel Restaurante Barcelona" },
    }));

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { restaurantId: restaurant.id, lastLoginAt: new Date() },
    create: {
      email: DEMO_EMAIL,
      restaurantId: restaurant.id,
      role: "manager",
      lastLoginAt: new Date(),
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.restaurantId = user.restaurantId;
  session.role = "manager";
  await session.save();

  return new NextResponse(null, { status: 204 });
}
