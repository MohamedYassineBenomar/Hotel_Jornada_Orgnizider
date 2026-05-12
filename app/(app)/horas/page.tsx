import { HoursTable, type SummaryRow } from "@/components/summary/hours-table";
import { tryGetAuthedSession } from "@/lib/auth/middleware-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionary";
import { tFromDictionary } from "@/lib/i18n/t";
import {
  currentIsoWeekKey,
  isoWeekDates,
  isoWeekEnd,
  isoWeekStart,
} from "@/lib/time/iso-week";
import { toMadridDateKey } from "@/lib/time/madrid";

export const dynamic = "force-dynamic";

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export default async function HoursPage() {
  const session = await tryGetAuthedSession();
  if (!session) return null;
  const dict = await loadDictionary(DEFAULT_LOCALE);
  const t = (k: string) => tFromDictionary(dict, k);

  const weekKey = currentIsoWeekKey();
  const weekStart = isoWeekStart(weekKey);
  const weekEnd = isoWeekEnd(weekKey);
  const weekDateSet = new Set(isoWeekDates(weekKey).map((d) => toMadridDateKey(d)));

  const monthStart = new Date(weekStart);
  monthStart.setUTCDate(1);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  monthEnd.setUTCDate(0);

  const yearStart = new Date(Date.UTC(weekStart.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(weekStart.getUTCFullYear(), 11, 31));

  const workers = await prisma.worker.findMany({
    where: { restaurantId: session.restaurantId, archivedAt: null },
    orderBy: { displayName: "asc" },
    include: {
      vacationBlocks: true,
      shifts: {
        where: {
          scheduleWeek: { restaurantId: session.restaurantId },
          date: { gte: monthStart, lte: monthEnd },
        },
        include: { scheduleWeek: true },
      },
    },
  });

  const rows: SummaryRow[] = workers.map((w) => {
    let weekMinutes = 0;
    let monthMinutes = 0;
    const workedDates = new Set<string>();
    let draftIncluded = false;

    for (const s of w.shifts) {
      const isCurrentWeek =
        s.scheduleWeek.isoYear === weekKey.isoYear &&
        s.scheduleWeek.isoWeek === weekKey.isoWeek;
      const isDraft = s.scheduleWeek.status === "draft";
      const include = s.scheduleWeek.status === "published" || (isDraft && isCurrentWeek);
      if (!include) continue;
      if (isDraft) draftIncluded = true;

      const dur = s.endMinute - s.startMinute;
      monthMinutes += dur;
      const dateKey = toMadridDateKey(s.date);
      if (s.date >= weekStart && s.date <= weekEnd) {
        weekMinutes += dur;
        if (weekDateSet.has(dateKey)) workedDates.add(dateKey);
      }
    }

    let vacationUsedYTD = 0;
    for (const b of w.vacationBlocks) {
      const bs = b.startDate < yearStart ? yearStart : b.startDate;
      const be = b.endDate > yearEnd ? yearEnd : b.endDate;
      if (be >= bs) vacationUsedYTD += daysBetween(bs, be);
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <header>
        <h1 className="text-2xl font-semibold">{t("hours.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("hours.subtitle")}</p>
      </header>
      <HoursTable rows={rows} />
    </div>
  );
}
