export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";

export const GET = handler({ auth: true }, async ({ session, searchParams }) => {
  const isoYearStr = searchParams.get("isoYear");
  const isoWeekStr = searchParams.get("isoWeek");
  if (!isoYearStr || !isoWeekStr) {
    throw new AppError("VALIDATION", "Faltan parámetros isoYear/isoWeek.", 400);
  }
  const isoYear = Number(isoYearStr);
  const isoWeek = Number(isoWeekStr);
  if (!Number.isInteger(isoYear) || !Number.isInteger(isoWeek)) {
    throw new AppError("VALIDATION", "Parámetros no válidos.", 400);
  }

  const week = await prisma.scheduleWeek.upsert({
    where: {
      restaurantId_isoYear_isoWeek: {
        restaurantId: session.restaurantId,
        isoYear,
        isoWeek,
      },
    },
    update: {},
    create: {
      restaurantId: session.restaurantId,
      isoYear,
      isoWeek,
    },
  });

  return NextResponse.json({ week });
});
