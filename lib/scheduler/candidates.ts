/**
 * Generate candidate shifts: (worker, day, segment, role, zone) tuples that
 * are individually feasible against per-worker constraints (qualifications,
 * day-off, vacation, zone-role validity).
 *
 * The propagator picks among these to satisfy coverage. The set is small
 * because we draw start/end times from the template list plus a handful of
 * adaptive fill segments — not the full Cartesian product of 36 slot pairs.
 */

import {
  FLOOR_ROLES,
  KITCHEN_ROLES,
  ZONE_ROLE_MAP,
  type WorkerRoleLiteral,
  type ZoneLiteral,
} from "@/lib/constants";
import { TEMPLATES, HANDOFF_SEGMENTS } from "./templates";
import type {
  CandidateShift,
  DayInput,
  SchedulerSettings,
  WorkerInput,
} from "./types";

/** Standard segment offerings (start, end pairs) we try. */
const STANDARD_SEGMENTS: ReadonlyArray<{ start: number; end: number }> = [
  { start: 360, end: 900 }, // 06–15
  { start: 480, end: 960 }, // 08–16
  { start: 540, end: 1020 }, // 09–17
  { start: 660, end: 1140 }, // 11–19
  { start: 720, end: 1200 }, // 12–20
  { start: 840, end: 1320 }, // 14–22
  { start: 900, end: 1380 }, // 15–23
  { start: 540, end: 900 }, // 09–15 (short)
  { start: 900, end: 1260 }, // 15–21 (short)
  { start: 660, end: 1380 }, // 11–23 (closer terraza)
];

function workerCanWork(
  worker: WorkerInput,
  day: DayInput,
): boolean {
  if (worker.fixedDaysOff.includes(day.isoWeekday)) return false;
  if (worker.vacationDateKeys.has(day.date)) return false;
  return true;
}

function workerCanZoneRole(
  worker: WorkerInput,
  zone: ZoneLiteral,
  role: WorkerRoleLiteral,
): boolean {
  if (!worker.qualifiedRoles.includes(role)) return false;
  if (!ZONE_ROLE_MAP[zone].includes(role)) return false;
  return true;
}

/**
 * For a worker on a given day, emit all candidate (segment, zone, role) tuples
 * that respect per-worker hard constraints.
 *
 * Coverage is checked later by the propagator; here we just emit per-worker
 * feasible options.
 */
export function generateCandidatesForWorkerDay(
  worker: WorkerInput,
  day: DayInput,
  settings: SchedulerSettings,
): CandidateShift[] {
  if (!workerCanWork(worker, day)) return [];

  const out: CandidateShift[] = [];

  // Limit segments to operating hours.
  const segments = STANDARD_SEGMENTS.filter(
    (s) =>
      s.start >= settings.operatingHoursStart &&
      s.end <= settings.operatingHoursEnd,
  );

  // 1) Per-zone segments (zones × roles × segments).
  const zoneRoleCombos: Array<{ zone: ZoneLiteral; role: WorkerRoleLiteral }> = [];
  for (const zone of ["planta_0", "terraza"] as const) {
    if (zone === "terraza" && !day.isTerraceSeason) continue;
    for (const role of worker.qualifiedRoles) {
      if (!workerCanZoneRole(worker, zone, role)) continue;
      zoneRoleCombos.push({ zone, role });
    }
  }

  for (const { zone, role } of zoneRoleCombos) {
    for (const seg of segments) {
      // Restrict terraza to terraza hours.
      let start = seg.start;
      let end = seg.end;
      if (zone === "terraza") {
        start = Math.max(start, settings.terraceHoursStart);
        end = Math.min(end, settings.terraceHoursEnd);
        if (end - start < 60) continue;
      }
      out.push({
        workerId: worker.id,
        date: day.date,
        startMinute: start,
        endMinute: end,
        zone,
        role,
        segmentGroupId: null,
        score: 0,
      });
    }
  }

  // 2) Handoff candidates: in summer, a single waiter starts on planta_0 and
  // switches to terraza at 11:00. We emit each pair under a shared
  // segmentGroupId so the propagator can place them together.
  if (day.isTerraceSeason) {
    const handoffRoles = worker.qualifiedRoles.filter((r) =>
      FLOOR_ROLES.includes(r),
    );
    if (handoffRoles.length > 0) {
      for (const role of handoffRoles) {
        const groupId = `${worker.id}:${day.date}:handoff:${role}`;
        for (const seg of HANDOFF_SEGMENTS) {
          out.push({
            workerId: worker.id,
            date: day.date,
            startMinute: seg.startMinute,
            endMinute: seg.endMinute,
            zone: seg.zone,
            role,
            segmentGroupId: groupId,
            score: 0,
          });
        }
      }
    }
  }

  return out;
}

/** Convenience: kitchen-only single-segment for cooks. */
export function isKitchenRequirement(role: WorkerRoleLiteral): boolean {
  return KITCHEN_ROLES.includes(role);
}
