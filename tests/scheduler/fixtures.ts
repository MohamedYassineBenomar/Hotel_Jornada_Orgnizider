/**
 * Sample weeks for solver assertions. Run with `tsx tests/scheduler/coverage.test.ts`.
 */

import type {
  DayInput,
  PinnedShift,
  SchedulerSettings,
  WorkerInput,
} from "@/lib/scheduler/types";

const DEFAULT_SETTINGS: SchedulerSettings = {
  operatingHoursStart: 360,
  operatingHoursEnd: 1440,
  terraceHoursStart: 660,
  terraceHoursEnd: 1380,
  terraceSeasonMonths: [4, 5, 6, 7, 8, 9],
};

function mondayWeek(dateBase: string): DayInput[] {
  const isoBase = new Date(dateBase);
  const out: DayInput[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(isoBase);
    d.setUTCDate(d.getUTCDate() + i);
    out.push({
      date: d.toISOString().slice(0, 10),
      isoWeekday: (i % 7) + 1,
      isTerraceSeason: false,
    });
  }
  return out;
}

export interface Fixture {
  name: string;
  workers: WorkerInput[];
  days: DayInput[];
  pinned: PinnedShift[];
  settings: SchedulerSettings;
}

export const FEASIBLE_FIXTURE: Fixture = {
  name: "feasible",
  workers: [
    {
      id: "w1",
      displayName: "Camarero A",
      qualifiedRoles: ["camarero"],
      maxWeeklyHours: 45,
      fixedDaysOff: [],
      annualVacationDays: 30,
      vacationDateKeys: new Set(),
    },
    {
      id: "w2",
      displayName: "Camarero B",
      qualifiedRoles: ["camarero"],
      maxWeeklyHours: 45,
      fixedDaysOff: [],
      annualVacationDays: 30,
      vacationDateKeys: new Set(),
    },
    {
      id: "w3",
      displayName: "Cocinero A",
      qualifiedRoles: ["cocinero"],
      maxWeeklyHours: 45,
      fixedDaysOff: [],
      annualVacationDays: 30,
      vacationDateKeys: new Set(),
    },
    {
      id: "w4",
      displayName: "Cocinero B",
      qualifiedRoles: ["cocinero"],
      maxWeeklyHours: 45,
      fixedDaysOff: [],
      annualVacationDays: 30,
      vacationDateKeys: new Set(),
    },
  ],
  days: mondayWeek("2026-05-04"),
  pinned: [],
  settings: DEFAULT_SETTINGS,
};

export const INFEASIBLE_FIXTURE: Fixture = {
  name: "infeasible (no cocinero)",
  workers: [
    {
      id: "w1",
      displayName: "Camarero A",
      qualifiedRoles: ["camarero"],
      maxWeeklyHours: 45,
      fixedDaysOff: [],
      annualVacationDays: 30,
      vacationDateKeys: new Set(),
    },
  ],
  days: mondayWeek("2026-05-04"),
  pinned: [],
  settings: DEFAULT_SETTINGS,
};
