export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { z } from "zod";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { autofill } from "@/lib/scheduler";

const BodySchema = z.object({
  overwrite: z.boolean().default(false),
});

export const POST = handler(
  { auth: true, body: BodySchema },
  async ({ params, session, body }) => {
    const week = await prisma.scheduleWeek.findFirst({
      where: { id: params.id, restaurantId: session.restaurantId },
    });
    if (!week) throw new AppError("NOT_FOUND", "Semana no encontrada.", 404);
    if (week.status === "published") {
      throw new AppError(
        "CONFLICT",
        "No se puede auto-llenar una semana publicada.",
        409,
      );
    }

    const result = await autofill(week.id, { overwrite: body!.overwrite });
    return NextResponse.json({
      shiftsCreated: result.assignments.filter((a) => !a.pinned).length,
      uncovered: result.uncovered,
      durationMs: result.durationMs,
    });
  },
);
