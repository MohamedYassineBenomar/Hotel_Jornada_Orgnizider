/**
 * Inline validator for shift edits.
 *
 * Returns the list of violations against the spec's hard + soft rules.
 * Used by:
 *   - the shift CRUD API (to surface violations on save)
 *   - the publish endpoint (to refuse publish on any hard violation)
 *
 * Violations are keyed by translation code so the UI can render them in any
 * locale; we ship es-ES strings via the dictionary.
 */

import {
  FLOOR_ROLES,
  KITCHEN_ROLES,
  NEAR_MAX_HOURS_BUFFER,
  SHIFT_MAX_HOURS,
  SHIFT_MIN_HOURS,
  ZONE_ROLE_MAP,
  type WorkerRoleLiteral,
  type ZoneLiteral,
} from "@/lib/constants";
import { intervalsOverlap } from "@/lib/time/minutes";
import type { DayInput, SchedulerSettings, WorkerInput } from "./types";

export type ViolationSeverity = "hard" | "soft";

export interface Violation {
  code: string;
  severity: ViolationSeverity;
  /** Set of shift IDs involved. Empty if the violation is at coverage level. */
  shiftIds: ReadonlyArray<string>;
  date?: string;
  startMinute?: number;
  endMinute?: number;
}

export interface ShiftLike {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD (Madrid)
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  role: WorkerRoleLiteral;
}

export interface ValidateArgs {
  shifts: ReadonlyArray<ShiftLike>;
  workers: ReadonlyArray<WorkerInput>;
  days: ReadonlyArray<DayInput>;
  settings: SchedulerSettings;
}

export interface ValidateResult {
  violations: Violation[];
  hardCount: number;
  softCount: number;
}

export function validate(args: ValidateArgs): ValidateResult {
  const violations: Violation[] = [];

  const workerById = new Map(args.workers.map((w) => [w.id, w]));
  const dayByDate = new Map(args.days.map((d) => [d.date, d]));

  // Per-worker accumulation.
  const minutesByWorker = new Map<string, number>();

  for (const s of args.shifts) {
    const worker = workerById.get(s.workerId);
    if (!worker) continue;

    // 1. Role-zone validity
    if (!worker.qualifiedRoles.includes(s.role)) {
      violations.push({
        code: "validation.error.role_not_qualified",
        severity: "hard",
        shiftIds: [s.id],
      });
    }
    if (!ZONE_ROLE_MAP[s.zone].includes(s.role)) {
      violations.push({
        code: "validation.error.zone_invalid_for_role",
        severity: "hard",
        shiftIds: [s.id],
      });
    }

    // 2. Operating-hours window
    if (
      s.startMinute < args.settings.operatingHoursStart ||
      s.endMinute > args.settings.operatingHoursEnd
    ) {
      violations.push({
        code: "validation.error.out_of_operating_hours",
        severity: "hard",
        shiftIds: [s.id],
      });
    }

    // 3. Day-off
    const day = dayByDate.get(s.date);
    if (day && worker.fixedDaysOff.includes(day.isoWeekday)) {
      violations.push({
        code: "validation.error.day_off",
        severity: "hard",
        shiftIds: [s.id],
      });
    }

    // 4. Vacation
    if (worker.vacationDateKeys.has(s.date)) {
      violations.push({
        code: "validation.error.vacation",
        severity: "hard",
        shiftIds: [s.id],
      });
    }

    // 5. Per-worker accumulation
    const dur = s.endMinute - s.startMinute;
    minutesByWorker.set(
      s.workerId,
      (minutesByWorker.get(s.workerId) ?? 0) + dur,
    );

    // 6. Soft: shift length
    const hours = dur / 60;
    if (hours < SHIFT_MIN_HOURS) {
      violations.push({
        code: "validation.warn.too_short",
        severity: "soft",
        shiftIds: [s.id],
      });
    } else if (hours > SHIFT_MAX_HOURS) {
      violations.push({
        code: "validation.warn.too_long",
        severity: "soft",
        shiftIds: [s.id],
      });
    }
  }

  // 7. Per-worker max hours + near-max warning
  for (const [workerId, minutes] of minutesByWorker) {
    const worker = workerById.get(workerId);
    if (!worker) continue;
    const maxMinutes = worker.maxWeeklyHours * 60;
    if (minutes > maxMinutes) {
      violations.push({
        code: "validation.error.over_hours",
        severity: "hard",
        shiftIds: [],
      });
    } else if (minutes >= maxMinutes - NEAR_MAX_HOURS_BUFFER * 60) {
      violations.push({
        code: "validation.warn.near_max_hours",
        severity: "soft",
        shiftIds: [],
      });
    }
  }

  // 8. Double-booking
  const byWorker = new Map<string, ShiftLike[]>();
  for (const s of args.shifts) {
    const arr = byWorker.get(s.workerId) ?? [];
    arr.push(s);
    byWorker.set(s.workerId, arr);
  }
  for (const [, shifts] of byWorker) {
    const byDate = new Map<string, ShiftLike[]>();
    for (const s of shifts) {
      const arr = byDate.get(s.date) ?? [];
      arr.push(s);
      byDate.set(s.date, arr);
    }
    for (const [, ds] of byDate) {
      for (let i = 0; i < ds.length; i++) {
        for (let j = i + 1; j < ds.length; j++) {
          if (
            intervalsOverlap(
              ds[i].startMinute,
              ds[i].endMinute,
              ds[j].startMinute,
              ds[j].endMinute,
            )
          ) {
            violations.push({
              code: "validation.error.double_booked",
              severity: "hard",
              shiftIds: [ds[i].id, ds[j].id],
              date: ds[i].date,
            });
          }
        }
      }
    }
  }

  // 9. Coverage rules (floor / kitchen / terraza).
  for (const day of args.days) {
    const shiftsOnDay = args.shifts.filter((s) => s.date === day.date);

    coverageWindow({
      day,
      shifts: shiftsOnDay,
      zone: "planta_0",
      acceptedRoles: FLOOR_ROLES,
      windowStart: args.settings.operatingHoursStart,
      windowEnd: args.settings.operatingHoursEnd,
      violationCode: "validation.error.coverage_floor",
      violations,
    });
    coverageWindow({
      day,
      shifts: shiftsOnDay,
      zone: "planta_0",
      acceptedRoles: KITCHEN_ROLES,
      windowStart: args.settings.operatingHoursStart,
      windowEnd: args.settings.operatingHoursEnd,
      violationCode: "validation.error.coverage_kitchen",
      violations,
    });
    if (day.isTerraceSeason) {
      coverageWindow({
        day,
        shifts: shiftsOnDay,
        zone: "terraza",
        acceptedRoles: FLOOR_ROLES,
        windowStart: args.settings.terraceHoursStart,
        windowEnd: args.settings.terraceHoursEnd,
        violationCode: "validation.error.coverage_terraza",
        violations,
      });
    }
  }

  const hardCount = violations.filter((v) => v.severity === "hard").length;
  const softCount = violations.filter((v) => v.severity === "soft").length;
  return { violations, hardCount, softCount };
}

function coverageWindow(args: {
  day: DayInput;
  shifts: ReadonlyArray<ShiftLike>;
  zone: ZoneLiteral;
  acceptedRoles: ReadonlyArray<WorkerRoleLiteral>;
  windowStart: number;
  windowEnd: number;
  violationCode: string;
  violations: Violation[];
}): void {
  const relevant = args.shifts.filter(
    (s) => s.zone === args.zone && args.acceptedRoles.includes(s.role),
  );
  // Walk 30-minute steps. If any uncovered slot exists, emit one violation
  // (collapsed) for the gap.
  let gapStart: number | null = null;
  for (let m = args.windowStart; m < args.windowEnd; m += 30) {
    const covered = relevant.some(
      (s) => s.startMinute <= m && s.endMinute >= m + 30,
    );
    if (!covered) {
      if (gapStart === null) gapStart = m;
    } else if (gapStart !== null) {
      args.violations.push({
        code: args.violationCode,
        severity: "hard",
        shiftIds: [],
        date: args.day.date,
        startMinute: gapStart,
        endMinute: m,
      });
      gapStart = null;
    }
  }
  if (gapStart !== null) {
    args.violations.push({
      code: args.violationCode,
      severity: "hard",
      shiftIds: [],
      date: args.day.date,
      startMinute: gapStart,
      endMinute: args.windowEnd,
    });
  }
}
