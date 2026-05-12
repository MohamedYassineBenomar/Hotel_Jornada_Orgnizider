export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { toMadridDateKey } from "@/lib/time/madrid";

export const GET = handler({ auth: true }, async ({ params, session }) => {
  const week = await prisma.scheduleWeek.findFirst({
    where: { id: params.id, restaurantId: session.restaurantId },
    include: {
      shifts: { orderBy: [{ date: "asc" }, { startMinute: "asc" }] },
      uncoveredSlots: { orderBy: [{ date: "asc" }, { startMinute: "asc" }] },
    },
  });
  if (!week) throw new AppError("NOT_FOUND", "Semana no encontrada.", 404);

  // Per-worker minute totals (for hours summary inline).
  const totals: Record<string, number> = {};
  for (const s of week.shifts) {
    totals[s.workerId] =
      (totals[s.workerId] ?? 0) + (s.endMinute - s.startMinute);
  }

  return NextResponse.json({
    week: {
      ...week,
      shifts: week.shifts.map((s) => ({
        ...s,
        date: toMadridDateKey(s.date),
      })),
      uncoveredSlots: week.uncoveredSlots.map((u) => ({
        ...u,
        date: toMadridDateKey(u.date),
      })),
    },
    workerMinuteTotals: totals,
  });
});
