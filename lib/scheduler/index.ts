/**
 * Public scheduler entrypoint.
 *
 * Usage:
 *   const result = await autofill(weekId, { overwrite });
 *   // result.assignments and result.uncovered are already persisted.
 */

import { prisma } from "@/lib/db";
import { fromMadridDateKey } from "@/lib/time/madrid";

import { buildCoverageRequirements } from "./coverage";
import { loadSolverInputs } from "./inputs";
import { propagate } from "./propagate";
import { buildUncoveredWithDefaultLocale } from "./uncovered";
import type {
  ScheduledAssignment,
  SolverResult,
  UncoveredSlotOut,
} from "./types";

export interface AutofillOptions {
  /** If true, delete existing non-pinned draft shifts and the previous uncovered set before assigning. */
  overwrite: boolean;
}

export async function autofill(
  weekId: string,
  opts: AutofillOptions,
): Promise<SolverResult> {
  const t0 = Date.now();

  const inputs = await loadSolverInputs(weekId, { excludeArchived: true });

  if (opts.overwrite) {
    await prisma.$transaction([
      prisma.shift.deleteMany({
        where: { scheduleWeekId: weekId, pinned: false },
      }),
      prisma.uncoveredSlot.deleteMany({
        where: { scheduleWeekId: weekId },
      }),
    ]);
  }

  const requirements = buildCoverageRequirements(inputs.days, inputs.settings);

  const propagateResult = propagate({
    days: inputs.days,
    workers: inputs.workers,
    pinned: inputs.pinned,
    requirements,
    settings: inputs.settings,
  });

  const uncovered: UncoveredSlotOut[] = await buildUncoveredWithDefaultLocale(
    propagateResult.unsatisfied,
    inputs.workers,
  );

  // Persist new (non-pinned) assignments.
  const toCreate = propagateResult.assignments.filter((a) => !a.pinned);
  if (toCreate.length > 0) {
    await prisma.shift.createMany({
      data: toCreate.map((a) => ({
        scheduleWeekId: weekId,
        workerId: a.workerId,
        date: fromMadridDateKey(a.date),
        startMinute: a.startMinute,
        endMinute: a.endMinute,
        zone: a.zone,
        role: a.role,
        pinned: false,
        segmentGroupId: a.segmentGroupId,
      })),
    });
  }

  if (uncovered.length > 0) {
    await prisma.uncoveredSlot.createMany({
      data: uncovered.map((u) => ({
        scheduleWeekId: weekId,
        date: fromMadridDateKey(u.date),
        startMinute: u.startMinute,
        endMinute: u.endMinute,
        zone: u.zone,
        requiredRole: u.requiredRole,
        reasonEs: u.reasonEs,
      })),
    });
  }

  const durationMs = Date.now() - t0;

  // Final list of all assignments (pinned + newly placed) for the response.
  const allAssignments: ScheduledAssignment[] = propagateResult.assignments;

  return {
    assignments: allAssignments,
    uncovered,
    durationMs,
  };
}
