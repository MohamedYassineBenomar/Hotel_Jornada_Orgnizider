/**
 * Smoke tests for the propagator. Run via:
 *   npx tsx tests/scheduler/coverage.test.ts
 */

import { buildCoverageRequirements } from "@/lib/scheduler/coverage";
import { propagate } from "@/lib/scheduler/propagate";

import { FEASIBLE_FIXTURE, INFEASIBLE_FIXTURE } from "./fixtures";

function assert(cond: boolean, label: string): void {
  if (!cond) {
    // eslint-disable-next-line no-console
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  ", label);
  }
}

const reqFeasible = buildCoverageRequirements(
  FEASIBLE_FIXTURE.days,
  FEASIBLE_FIXTURE.settings,
);
const feasibleResult = propagate({
  days: FEASIBLE_FIXTURE.days,
  workers: FEASIBLE_FIXTURE.workers,
  pinned: FEASIBLE_FIXTURE.pinned,
  requirements: reqFeasible,
  settings: FEASIBLE_FIXTURE.settings,
});
assert(
  feasibleResult.assignments.length > 0,
  "feasible: produces at least one assignment",
);

const reqInfeasible = buildCoverageRequirements(
  INFEASIBLE_FIXTURE.days,
  INFEASIBLE_FIXTURE.settings,
);
const infeasibleResult = propagate({
  days: INFEASIBLE_FIXTURE.days,
  workers: INFEASIBLE_FIXTURE.workers,
  pinned: INFEASIBLE_FIXTURE.pinned,
  requirements: reqInfeasible,
  settings: INFEASIBLE_FIXTURE.settings,
});
assert(
  infeasibleResult.unsatisfied.length > 0,
  "infeasible: emits uncovered slots when kitchen coverage cannot be met",
);

// Sanity: no double-bookings in feasible result.
const byWorker = new Map<string, Array<[number, number, string]>>();
for (const a of feasibleResult.assignments) {
  const arr = byWorker.get(a.workerId) ?? [];
  arr.push([a.startMinute, a.endMinute, a.date]);
  byWorker.set(a.workerId, arr);
}
let anyDouble = false;
for (const [, list] of byWorker) {
  const byDate = new Map<string, Array<[number, number]>>();
  for (const [s, e, d] of list) {
    const cur = byDate.get(d) ?? [];
    cur.push([s, e]);
    byDate.set(d, cur);
  }
  for (const [, intervals] of byDate) {
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const [s1, e1] = intervals[i];
        const [s2, e2] = intervals[j];
        if (s1 < e2 && s2 < e1) anyDouble = true;
      }
    }
  }
}
assert(!anyDouble, "feasible: no double-bookings");
