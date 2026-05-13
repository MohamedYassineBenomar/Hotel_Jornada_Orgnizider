import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@jornada.local";

export default async function MarketingLanding(): Promise<never> {
  const session = await getSession();
  if (!session.userId) {
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

    session.userId = user.id;
    session.restaurantId = user.restaurantId;
    session.role = "manager";
    await session.save();
  }
  redirect("/panel");
}
