/**
 * Load everything the solver needs for a given ScheduleWeek.
 *
 * Pure-ish: takes only a weekId + Prisma client and returns plain TS objects
 * the rest of the scheduler can consume.
 */

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { isoWeekDates, isoWeekdayOf } from "@/lib/time/iso-week";
import { toMadridDateKey } from "@/lib/time/madrid";
import type {
  DayInput,
  PinnedShift,
  SchedulerSettings,
  WorkerInput,
} from "./types";
import type { WorkerRoleLiteral, ZoneLiteral } from "@/lib/constants";

export interface SolverInputs {
  weekId: string;
  restaurantId: string;
  isoYear: number;
  isoWeek: number;
  days: DayInput[];
  workers: WorkerInput[];
  pinned: PinnedShift[];
  settings: SchedulerSettings;
}

export interface LoadOptions {
  /** If true, skip workers archived on the week-start date. */
  excludeArchived?: boolean;
}

export async function loadSolverInputs(
  weekId: string,
  options: LoadOptions = { excludeArchived: true },
): Promise<SolverInputs> {
  const week = await prisma.scheduleWeek.findUnique({
    where: { id: weekId },
    include: { restaurant: true },
  });
  if (!week) {
    throw new Error(`ScheduleWeek ${weekId} not found`);
  }

  const dates = isoWeekDates({
    isoYear: week.isoYear,
    isoWeek: week.isoWeek,
  });
  const dateKeys = dates.map((d) => toMadridDateKey(d));

  const days: DayInput[] = dates.map((d, i) => {
    const isoWeekday = isoWeekdayOf(d);
    const monthIdx = Number(toMadridDateKey(d).slice(5, 7));
    const isTerraceSeason =
      week.restaurant.terraceSeasonMonths.includes(monthIdx);
    return {
      date: dateKeys[i],
      isoWeekday,
      isTerraceSeason,
    };
  });

  const where: Prisma.WorkerWhereInput = {
    restaurantId: week.restaurantId,
  };
  if (options.excludeArchived) {
    where.archivedAt = null;
  }

  const workerRows = await prisma.worker.findMany({
    where,
    include: {
      vacationBlocks: true,
    },
  });

  const workers: WorkerInput[] = workerRows.map((w) => {
    const vacationDateKeys = new Set<string>();
    for (const block of w.vacationBlocks) {
      // Build every YYYY-MM-DD between startDate and endDate (inclusive).
      const start = new Date(block.startDate);
      const end = new Date(block.endDate);
      const cursor = new Date(start);
      while (cursor <= end) {
        vacationDateKeys.add(toMadridDateKey(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return {
      id: w.id,
      displayName: w.displayName,
      qualifiedRoles: w.qualifiedRoles as WorkerRoleLiteral[],
      maxWeeklyHours: w.maxWeeklyHours,
      fixedDaysOff: w.fixedDaysOff,
      annualVacationDays: w.annualVacationDays,
      vacationDateKeys,
    };
  });

  const pinnedRows = await prisma.shift.findMany({
    where: {
      scheduleWeekId: weekId,
      pinned: true,
    },
  });
  const pinned: PinnedShift[] = pinnedRows.map((p) => ({
    workerId: p.workerId,
    date: toMadridDateKey(p.date),
    startMinute: p.startMinute,
    endMinute: p.endMinute,
    zone: p.zone as ZoneLiteral,
    role: p.role as WorkerRoleLiteral,
    segmentGroupId: p.segmentGroupId,
  }));

  return {
    weekId,
    restaurantId: week.restaurantId,
    isoYear: week.isoYear,
    isoWeek: week.isoWeek,
    days,
    workers,
    pinned,
    settings: {
      operatingHoursStart: week.restaurant.operatingHoursStart,
      operatingHoursEnd: week.restaurant.operatingHoursEnd,
      terraceHoursStart: week.restaurant.terraceHoursStart,
      terraceHoursEnd: week.restaurant.terraceHoursEnd,
      terraceSeasonMonths: week.restaurant.terraceSeasonMonths,
    },
  };
}
