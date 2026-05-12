import { notFound } from "next/navigation";

import { ScheduleView } from "@/components/schedule/schedule-view";
import { tryGetAuthedSession } from "@/lib/auth/middleware-helpers";
import { prisma } from "@/lib/db";
import { loadSolverInputs } from "@/lib/scheduler/inputs";
import { validate, type ShiftLike } from "@/lib/scheduler/validate";
import {
  isoWeekDates,
  isoWeekdayOf,
  parseIsoWeekKey,
} from "@/lib/time/iso-week";
import { toMadridDateKey } from "@/lib/time/madrid";
import type { WorkerRoleLiteral, ZoneLiteral } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ isoYearWeek: string }>;
}

export default async function HorarioPage({ params }: PageProps) {
  const { isoYearWeek } = await params;
  let weekKey;
  try {
    weekKey = parseIsoWeekKey(isoYearWeek);
  } catch {
    notFound();
  }
  const session = await tryGetAuthedSession();
  if (!session) return null;

  const week = await prisma.scheduleWeek.upsert({
    where: {
      restaurantId_isoYear_isoWeek: {
        restaurantId: session.restaurantId,
        isoYear: weekKey.isoYear,
        isoWeek: weekKey.isoWeek,
      },
    },
    update: {},
    create: {
      restaurantId: session.restaurantId,
      isoYear: weekKey.isoYear,
      isoWeek: weekKey.isoWeek,
    },
    include: {
      shifts: {
        include: { worker: true },
        orderBy: [{ date: "asc" }, { startMinute: "asc" }],
      },
      uncoveredSlots: {
        orderBy: [{ date: "asc" }, { startMinute: "asc" }],
      },
      restaurant: true,
    },
  });

  const workers = await prisma.worker.findMany({
    where: { restaurantId: session.restaurantId, archivedAt: null },
    orderBy: { displayName: "asc" },
  });

  const inputs = await loadSolverInputs(week.id, { excludeArchived: false });

  const shiftsForValidate: ShiftLike[] = week.shifts.map((s) => ({
    id: s.id,
    workerId: s.workerId,
    date: toMadridDateKey(s.date),
    startMinute: s.startMinute,
    endMinute: s.endMinute,
    zone: s.zone as ZoneLiteral,
    role: s.role as WorkerRoleLiteral,
  }));
  const validation = validate({
    shifts: shiftsForValidate,
    workers: inputs.workers,
    days: inputs.days,
    settings: inputs.settings,
  });

  const dates = isoWeekDates(weekKey);
  const weekDates = dates.map((d) => ({
    key: toMadridDateKey(d),
    weekday: isoWeekdayOf(d),
  }));

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 md:p-8">
      <ScheduleView
        weekKey={weekKey}
        weekId={week.id}
        weekStatus={week.status}
        weekDates={weekDates}
        operatingHoursStart={week.restaurant.operatingHoursStart}
        operatingHoursEnd={week.restaurant.operatingHoursEnd}
        workers={workers.map((w) => ({
          id: w.id,
          displayName: w.displayName,
          qualifiedRoles: w.qualifiedRoles,
        }))}
        shifts={week.shifts.map((s) => ({
          id: s.id,
          workerId: s.workerId,
          workerName: s.worker.displayName,
          date: toMadridDateKey(s.date),
          startMinute: s.startMinute,
          endMinute: s.endMinute,
          zone: s.zone as ZoneLiteral,
          role: s.role as WorkerRoleLiteral,
          pinned: s.pinned,
        }))}
        uncovered={week.uncoveredSlots.map((u) => ({
          id: u.id,
          date: toMadridDateKey(u.date),
          startMinute: u.startMinute,
          endMinute: u.endMinute,
          zone: u.zone as ZoneLiteral,
          requiredRole: u.requiredRole as WorkerRoleLiteral,
          reasonEs: u.reasonEs,
        }))}
        violations={validation.violations.map((v) => ({
          code: v.code,
          severity: v.severity,
          shiftIds: v.shiftIds,
        }))}
      />
    </div>
  );
}
