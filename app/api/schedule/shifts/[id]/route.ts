export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { ShiftUpdateSchema } from "@/lib/validation/shifts";
import { fromMadridDateKey } from "@/lib/time/madrid";

async function ensureShift(id: string, restaurantId: string) {
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { scheduleWeek: true },
  });
  if (!shift || shift.scheduleWeek.restaurantId !== restaurantId) {
    throw new AppError("NOT_FOUND", "Turno no encontrado.", 404);
  }
  return shift;
}

export const PATCH = handler(
  { auth: true, body: ShiftUpdateSchema },
  async ({ params, session, body }) => {
    await ensureShift(params.id, session.restaurantId);
    const updated = await prisma.shift.update({
      where: { id: params.id },
      data: {
        ...(body!.workerId !== undefined && { workerId: body!.workerId }),
        ...(body!.date !== undefined && { date: fromMadridDateKey(body!.date) }),
        ...(body!.startMinute !== undefined && { startMinute: body!.startMinute }),
        ...(body!.endMinute !== undefined && { endMinute: body!.endMinute }),
        ...(body!.zone !== undefined && { zone: body!.zone }),
        ...(body!.role !== undefined && { role: body!.role }),
        ...(body!.pinned !== undefined && { pinned: body!.pinned }),
        ...(body!.segmentGroupId !== undefined && {
          segmentGroupId: body!.segmentGroupId,
        }),
      },
    });
    return NextResponse.json({ shift: updated });
  },
);

export const DELETE = handler({ auth: true }, async ({ params, session }) => {
  await ensureShift(params.id, session.restaurantId);
  await prisma.shift.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
});
