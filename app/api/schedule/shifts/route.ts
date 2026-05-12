export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { ShiftCreateSchema } from "@/lib/validation/shifts";
import { fromMadridDateKey } from "@/lib/time/madrid";

export const POST = handler(
  { auth: true, body: ShiftCreateSchema },
  async ({ session, body }) => {
    const week = await prisma.scheduleWeek.findFirst({
      where: {
        id: body!.scheduleWeekId,
        restaurantId: session.restaurantId,
      },
    });
    if (!week) throw new AppError("NOT_FOUND", "Semana no encontrada.", 404);

    const worker = await prisma.worker.findFirst({
      where: { id: body!.workerId, restaurantId: session.restaurantId },
    });
    if (!worker) throw new AppError("NOT_FOUND", "Trabajador no encontrado.", 404);

    const shift = await prisma.shift.create({
      data: {
        scheduleWeekId: body!.scheduleWeekId,
        workerId: body!.workerId,
        date: fromMadridDateKey(body!.date),
        startMinute: body!.startMinute,
        endMinute: body!.endMinute,
        zone: body!.zone,
        role: body!.role,
        pinned: body!.pinned ?? false,
        segmentGroupId: body!.segmentGroupId ?? null,
      },
    });
    return NextResponse.json({ shift }, { status: 201 });
  },
);
