export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import {
  isoWeekDates,
  isoWeekEnd,
  isoWeekStart,
} from "@/lib/time/iso-week";
import { toMadridDateKey } from "@/lib/time/madrid";

interface WorkerSummary {
  workerId: string;
  displayName: string;
  hoursWeek: number;
  hoursMonth: number;
  daysWorked: number;
  vacationUsedYTD: number;
  vacationRemaining: number;
  annualVacationDays: number;
  draftIncluded: boolean;
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export const GET = handler({ auth: true }, async ({ session, searchParams }) => {
  const isoYearStr = searchParams.get("isoYear");
  const isoWeekStr = searchParams.get("isoWeek");
  if (!isoYearStr || !isoWeekStr) {
    throw new AppError("VALIDATION", "Faltan isoYear/isoWeek.", 400);
  }
  const isoYear = Number(isoYearStr);
  const isoWeek = Number(isoWeekStr);
  const key = { isoYear, isoWeek };

  const weekStart = isoWeekStart(key);
  const weekEnd = isoWeekEnd(key);
  const weekDates = isoWeekDates(key).map((d) => toMadridDateKey(d));

  // Month window: containing month of weekStart.
  const monthStart = new Date(weekStart);
  monthStart.setUTCDate(1);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  monthEnd.setUTCDate(0);

  const yearStart = new Date(Date.UTC(weekStart.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(weekStart.getUTCFullYear(), 11, 31));

  const workers = await prisma.worker.findMany({
    where: { restaurantId: session.restaurantId, archivedAt: null },
    include: {
      vacationBlocks: true,
      shifts: {
        where: {
          scheduleWeek: {
            restaurantId: session.restaurantId,
          },
          date: { gte: monthStart, lte: monthEnd },
        },
        include: { scheduleWeek: true },
      },
    },
  });

  const summaries: WorkerSummary[] = workers.map((w) => {
    let weekMinutes = 0;
    let monthMinutes = 0;
    const workedDates = new Set<string>();
    let draftIncluded = false;

    for (const s of w.shifts) {
      const isDraft = s.scheduleWeek.status === "draft";
      const isPublished = s.scheduleWeek.status === "published";
      // "Hours assigned" counts only published shifts plus the active draft if
      // the manager is viewing the current week.
      const isViewingWeek =
        s.scheduleWeek.isoYear === isoYear && s.scheduleWeek.isoWeek === isoWeek;
      const include = isPublished || (isDraft && isViewingWeek);
      if (!include) continue;
      if (isDraft) draftIncluded = true;

      const dur = s.endMinute - s.startMinute;
      const sDate = s.date;
      const dateKey = toMadridDateKey(sDate);
      if (sDate >= weekStart && sDate <= weekEnd) {
        weekMinutes += dur;
        if (weekDates.includes(dateKey)) {
          workedDates.add(dateKey);
        }
      }
      if (sDate >= monthStart && sDate <= monthEnd) {
        monthMinutes += dur;
      }
    }

    let vacationUsedYTD = 0;
    for (const b of w.vacationBlocks) {
      const blockStart = b.startDate < yearStart ? yearStart : b.startDate;
      const blockEnd = b.endDate > yearEnd ? yearEnd : b.endDate;
      if (blockEnd >= blockStart) {
        vacationUsedYTD += daysBetween(blockStart, blockEnd);
      }
    }

    return {
      workerId: w.id,
      displayName: w.displayName,
      hoursWeek: weekMinutes / 60,
      hoursMonth: monthMinutes / 60,
      daysWorked: workedDates.size,
      vacationUsedYTD,
      vacationRemaining: Math.max(0, w.annualVacationDays - vacationUsedYTD),
      annualVacationDays: w.annualVacationDays,
      draftIncluded,
    };
  });

  return NextResponse.json({ summaries });
});
