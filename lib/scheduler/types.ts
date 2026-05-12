/**
 * Shared types for the scheduler. Kept dependency-free of Prisma so the
 * solver is testable in isolation.
 */

import type { WorkerRoleLiteral, ZoneLiteral } from "@/lib/constants";

/** What a single worker can do, plus their constraints. */
export interface WorkerInput {
  id: string;
  displayName: string;
  qualifiedRoles: ReadonlyArray<WorkerRoleLiteral>;
  maxWeeklyHours: number;
  fixedDaysOff: ReadonlyArray<number>; // ISO weekday 1..7
  annualVacationDays: number;
  /** Set of date keys (YYYY-MM-DD in Madrid) the worker is on vacation. */
  vacationDateKeys: ReadonlySet<string>;
}

/** Pinned shift the manager already locked. */
export interface PinnedShift {
  workerId: string;
  date: string; // YYYY-MM-DD
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  role: WorkerRoleLiteral;
  segmentGroupId: string | null;
}

/** Per-day operating context. */
export interface DayInput {
  date: string; // YYYY-MM-DD (Madrid)
  isoWeekday: number; // 1..7
  isTerraceSeason: boolean;
}

/** Coverage requirement: "at least one X-qualified worker in zone Y from t1 to t2". */
export interface CoverageRequirement {
  date: string;
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  /** Any worker whose qualifiedRoles intersect this set can satisfy. */
  acceptedRoles: ReadonlyArray<WorkerRoleLiteral>;
  /** The role we'll record on the shift if we assign one. */
  primaryRole: WorkerRoleLiteral;
  /** Human-friendly key for emitting uncovered reasons. */
  kind: "floor" | "kitchen" | "terraza";
}

/** Restaurant scheduling settings (pulled from Restaurant row). */
export interface SchedulerSettings {
  operatingHoursStart: number;
  operatingHoursEnd: number;
  terraceHoursStart: number;
  terraceHoursEnd: number;
  terraceSeasonMonths: ReadonlyArray<number>;
}

/** Output: an assignment created (or kept) by the solver. */
export interface ScheduledAssignment {
  workerId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  role: WorkerRoleLiteral;
  pinned: boolean;
  segmentGroupId: string | null;
}

/** Output: a slot the solver could not fill. */
export interface UncoveredSlotOut {
  date: string;
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  requiredRole: WorkerRoleLiteral;
  reasonCode: string;
  reasonEs: string;
}

/** Final solver output. */
export interface SolverResult {
  assignments: ScheduledAssignment[];
  uncovered: UncoveredSlotOut[];
  durationMs: number;
}

/** A candidate shift the solver might place. */
export interface CandidateShift {
  workerId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  role: WorkerRoleLiteral;
  segmentGroupId: string | null;
  /** Higher = more preferred. */
  score: number;
}
