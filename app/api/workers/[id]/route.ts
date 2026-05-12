export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { WorkerUpdateSchema } from "@/lib/validation/workers";

async function ensureWorker(
  workerId: string,
  restaurantId: string,
): Promise<void> {
  const w = await prisma.worker.findFirst({
    where: { id: workerId, restaurantId },
    select: { id: true },
  });
  if (!w) throw new AppError("NOT_FOUND", "Trabajador no encontrado.", 404);
}

export const GET = handler({ auth: true }, async ({ params, session }) => {
  await ensureWorker(params.id, session.restaurantId);
  const worker = await prisma.worker.findUnique({
    where: { id: params.id },
    include: { vacationBlocks: { orderBy: { startDate: "asc" } } },
  });
  if (!worker) throw new AppError("NOT_FOUND", "Trabajador no encontrado.", 404);
  return NextResponse.json({ worker });
});

export const PATCH = handler(
  { auth: true, body: WorkerUpdateSchema },
  async ({ params, session, body }) => {
    await ensureWorker(params.id, session.restaurantId);
    const updated = await prisma.worker.update({
      where: { id: params.id },
      data: {
        ...(body!.displayName !== undefined && { displayName: body!.displayName }),
        ...(body!.qualifiedRoles !== undefined && {
          qualifiedRoles: body!.qualifiedRoles,
        }),
        ...(body!.maxWeeklyHours !== undefined && {
          maxWeeklyHours: body!.maxWeeklyHours,
        }),
        ...(body!.fixedDaysOff !== undefined && {
          fixedDaysOff: body!.fixedDaysOff,
        }),
        ...(body!.annualVacationDays !== undefined && {
          annualVacationDays: body!.annualVacationDays,
        }),
        ...(body!.archivedAt !== undefined && {
          archivedAt: body!.archivedAt ? new Date(body!.archivedAt) : null,
        }),
      },
    });
    return NextResponse.json({ worker: updated });
  },
);

export const DELETE = handler({ auth: true }, async ({ params, session }) => {
  await ensureWorker(params.id, session.restaurantId);
  const updated = await prisma.worker.update({
    where: { id: params.id },
    data: { archivedAt: new Date() },
  });
  return NextResponse.json({ worker: updated });
});
