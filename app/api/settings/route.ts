export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { SettingsUpdateSchema } from "@/lib/validation/settings";

export const GET = handler({ auth: true }, async ({ session }) => {
  const r = await prisma.restaurant.findUnique({
    where: { id: session.restaurantId },
  });
  if (!r) throw new AppError("NOT_FOUND", "Restaurante no encontrado.", 404);
  return NextResponse.json({ settings: r });
});

export const PATCH = handler(
  { auth: true, body: SettingsUpdateSchema },
  async ({ session, body }) => {
    if (
      body!.operatingHoursStart !== undefined &&
      body!.operatingHoursEnd !== undefined &&
      body!.operatingHoursStart >= body!.operatingHoursEnd
    ) {
      throw new AppError(
        "VALIDATION",
        "Apertura debe ser menor que cierre.",
        400,
      );
    }
    const updated = await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: { ...body },
    });
    return NextResponse.json({ settings: updated });
  },
);
