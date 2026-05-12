export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { loadSolverInputs } from "@/lib/scheduler/inputs";
import { validate, type ShiftLike } from "@/lib/scheduler/validate";
import type { WorkerRoleLiteral, ZoneLiteral } from "@/lib/constants";
import { toMadridDateKey } from "@/lib/time/madrid";

export const POST = handler({ auth: true }, async ({ params, session }) => {
  const week = await prisma.scheduleWeek.findFirst({
    where: { id: params.id, restaurantId: session.restaurantId },
    include: { shifts: true },
  });
  if (!week) throw new AppError("NOT_FOUND", "Semana no encontrada.", 404);

  const inputs = await loadSolverInputs(week.id, { excludeArchived: false });

  const shifts: ShiftLike[] = week.shifts.map((s) => ({
    id: s.id,
    workerId: s.workerId,
    date: toMadridDateKey(s.date),
    startMinute: s.startMinute,
    endMinute: s.endMinute,
    zone: s.zone as ZoneLiteral,
    role: s.role as WorkerRoleLiteral,
  }));

  const result = validate({
    shifts,
    workers: inputs.workers,
    days: inputs.days,
    settings: inputs.settings,
  });

  if (result.hardCount > 0) {
    throw new AppError(
      "VALIDATION",
      "No se puede publicar con violaciones críticas.",
      400,
    );
  }

  const updated = await prisma.scheduleWeek.update({
    where: { id: week.id },
    data: {
      status: "published",
      publishedAt: new Date(),
      publishedByUserId: session.userId,
    },
  });

  return NextResponse.json({ week: updated });
});
