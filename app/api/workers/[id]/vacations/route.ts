export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { VacationCreateSchema } from "@/lib/validation/vacations";
import { fromMadridDateKey } from "@/lib/time/madrid";

async function ensureWorker(workerId: string, restaurantId: string) {
  const w = await prisma.worker.findFirst({
    where: { id: workerId, restaurantId },
  });
  if (!w) throw new AppError("NOT_FOUND", "Trabajador no encontrado.", 404);
  return w;
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export const GET = handler({ auth: true }, async ({ params, session }) => {
  await ensureWorker(params.id, session.restaurantId);
  const vacations = await prisma.vacationBlock.findMany({
    where: { workerId: params.id },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json({ vacations });
});

export const POST = handler(
  { auth: true, body: VacationCreateSchema },
  async ({ params, session, body }) => {
    const worker = await ensureWorker(params.id, session.restaurantId);

    const startDate = fromMadridDateKey(body!.startDate);
    const endDate = fromMadridDateKey(body!.endDate);

    // Compute current usage.
    const existing = await prisma.vacationBlock.findMany({
      where: { workerId: worker.id },
    });
    const usedDays = existing.reduce(
      (sum, b) => sum + daysBetween(b.startDate, b.endDate),
      0,
    );
    const newDays = daysBetween(startDate, endDate);
    const remaining = worker.annualVacationDays - usedDays;
    if (newDays > remaining) {
      throw new AppError(
        "VALIDATION",
        "El trabajador no tiene suficientes días disponibles.",
        400,
      );
    }

    const created = await prisma.vacationBlock.create({
      data: {
        workerId: worker.id,
        startDate,
        endDate,
        note: body!.note?.length ? body!.note : null,
      },
    });
    return NextResponse.json({ vacation: created }, { status: 201 });
  },
);
