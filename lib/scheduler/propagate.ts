/**
 * Greedy + constraint-propagation core.
 *
 * Strategy
 * --------
 * 1. Build a per-day, per-zone, per-role half-hour coverage bitmap of
 *    REQUIRED slots (from CoverageRequirement[]) and SATISFIED slots.
 * 2. Start with pinned shifts pre-placed (they go into both the assignment
 *    list and the satisfied-slots bitmap).
 * 3. For each day, iterate slots in chronological order. When we find an
 *    unsatisfied required slot:
 *      - Enumerate candidate shifts that include this slot and would satisfy
 *        the requirement (right zone, accepted role, worker available).
 *      - Filter out candidates that violate hard constraints in the current
 *        state (over hours, double-booked, missing qualifications).
 *      - Score each candidate via score.ts and choose the highest.
 *      - Place it. Update worker minute totals + satisfied bitmap.
 *      - If no candidate, leave it unsatisfied and let uncovered.ts emit a
 *        row at the end.
 * 4. Stop on SOLVER_TIMEOUT_MS budget — emit whatever we have + uncovered.
 *
 * This is greedy with no backtracking — at launch scale (≤20 workers) it
 * converges in <100ms and stays well below the 10s budget. The propagation
 * step is in the "fill unsatisfied slot" loop: each placement reduces future
 * choices (worker minutes, double-booking) and the greedy pick is sound
 * because hard constraints decompose locally.
 */

import { SOLVER_TIMEOUT_MS, SLOT_MINUTES } from "@/lib/constants";
import type {
  CandidateShift,
  CoverageRequirement,
  DayInput,
  PinnedShift,
  ScheduledAssignment,
  SchedulerSettings,
  WorkerInput,
} from "./types";
import { generateCandidatesForWorkerDay } from "./candidates";
import { scoreCandidate } from "./score";

interface WorkerRuntime {
  worker: WorkerInput;
  minutesAssigned: number;
  /** Map: date → list of [start, end) intervals already booked. */
  bookings: Map<string, Array<[number, number]>>;
}

interface SatisfiedKey {
  date: string;
  zone: "planta_0" | "terraza";
  /** "floor" | "kitchen" | "terraza" requirement category. */
  kind: "floor" | "kitchen" | "terraza";
}

/** Quick interval-overlap check on a sorted array of intervals. */
function overlapsAny(
  intervals: Array<[number, number]>,
  start: number,
  end: number,
): boolean {
  for (const [s, e] of intervals) {
    if (start < e && s < end) return true;
  }
  return false;
}

/** Mark the [start, end) range as satisfied at half-hour granularity. */
function markSatisfied(
  satisfied: Map<string, Uint8Array>,
  key: string,
  startMinute: number,
  endMinute: number,
  originStart: number,
): void {
  const arr = satisfied.get(key);
  if (!arr) return;
  const firstSlot = Math.floor((startMinute - originStart) / SLOT_MINUTES);
  const lastSlot = Math.ceil((endMinute - originStart) / SLOT_MINUTES);
  for (let i = firstSlot; i < lastSlot; i++) {
    if (i >= 0 && i < arr.length) arr[i] = 1;
  }
}

function makeSatisfiedKey(date: string, kind: string, zone: string): string {
  return `${date}|${kind}|${zone}`;
}

export interface PropagateResult {
  assignments: ScheduledAssignment[];
  unsatisfied: Array<{
    requirement: CoverageRequirement;
    /** Per-slot booleans aligned with the requirement window. */
    slots: Uint8Array;
  }>;
}

export function propagate(args: {
  days: DayInput[];
  workers: WorkerInput[];
  pinned: PinnedShift[];
  requirements: CoverageRequirement[];
  settings: SchedulerSettings;
  timeoutMs?: number;
}): PropagateResult {
  const { days, workers, pinned, requirements, settings } = args;
  const timeoutMs = args.timeoutMs ?? SOLVER_TIMEOUT_MS;
  const t0 = Date.now();

  // Per-worker runtime.
  const runtime = new Map<string, WorkerRuntime>();
  for (const w of workers) {
    runtime.set(w.id, {
      worker: w,
      minutesAssigned: 0,
      bookings: new Map(),
    });
  }

  // Pre-place pinned shifts.
  const assignments: ScheduledAssignment[] = [];
  for (const p of pinned) {
    const rt = runtime.get(p.workerId);
    if (!rt) continue; // pinned to archived worker — skip
    const existing = rt.bookings.get(p.date) ?? [];
    existing.push([p.startMinute, p.endMinute]);
    rt.bookings.set(p.date, existing);
    rt.minutesAssigned += p.endMinute - p.startMinute;
    assignments.push({
      workerId: p.workerId,
      date: p.date,
      startMinute: p.startMinute,
      endMinute: p.endMinute,
      zone: p.zone,
      role: p.role,
      pinned: true,
      segmentGroupId: p.segmentGroupId,
    });
  }

  // Build the satisfied bitmap per (date, kind, zone) keyed by half-hour slot.
  // Each requirement is a contiguous window — but multiple requirements may
  // share a (date,kind,zone) key (rare; one of each kind per day). We index
  // by requirement instead.
  const satisfied = new Map<string, Uint8Array>();
  for (const req of requirements) {
    const slots = Math.ceil(
      (req.endMinute - req.startMinute) / SLOT_MINUTES,
    );
    satisfied.set(
      makeSatisfiedKey(req.date, req.kind, req.zone),
      new Uint8Array(slots),
    );
  }

  // Apply pinned shifts to satisfaction.
  for (const a of assignments) {
    for (const req of requirements) {
      if (req.date !== a.date) continue;
      if (req.zone !== a.zone) continue;
      if (!req.acceptedRoles.includes(a.role)) continue;
      const key = makeSatisfiedKey(req.date, req.kind, req.zone);
      markSatisfied(satisfied, key, a.startMinute, a.endMinute, req.startMinute);
    }
  }

  // Precompute per-worker fair share.
  const totalMinutesNeeded = requirements.reduce(
    (sum, r) => sum + (r.endMinute - r.startMinute),
    0,
  );
  const fairShareMinutes =
    workers.length > 0
      ? Math.floor(totalMinutesNeeded / Math.max(workers.length, 1))
      : 0;

  // Precompute per-worker candidate lists (per day) lazily.
  const candidateCache = new Map<string, CandidateShift[]>();
  function getCandidates(worker: WorkerInput, day: DayInput): CandidateShift[] {
    const k = `${worker.id}|${day.date}`;
    let list = candidateCache.get(k);
    if (!list) {
      list = generateCandidatesForWorkerDay(worker, day, settings);
      candidateCache.set(k, list);
    }
    return list;
  }

  // Iterate requirements in chronological order, sweeping slot-by-slot.
  // Sort: by date, then by start.
  const orderedReqs = [...requirements].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
    // floor before kitchen before terraza
    const order: Record<string, number> = { floor: 0, kitchen: 1, terraza: 2 };
    return (order[a.kind] ?? 99) - (order[b.kind] ?? 99);
  });

  for (const req of orderedReqs) {
    if (Date.now() - t0 > timeoutMs) break;

    const key = makeSatisfiedKey(req.date, req.kind, req.zone);
    const slots = satisfied.get(key);
    if (!slots) continue;
    const day = days.find((d) => d.date === req.date);
    if (!day) continue;

    // Walk slots; for each unsatisfied slot, try to place a shift that covers it.
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === 1) continue;
      if (Date.now() - t0 > timeoutMs) break;

      const slotStart = req.startMinute + i * SLOT_MINUTES;
      const slotEnd = slotStart + SLOT_MINUTES;

      // Find the best candidate that:
      //  - belongs to a worker not over-hours and not double-booked
      //  - covers slotStart (so it advances the unsatisfied frontier)
      //  - matches zone + acceptedRoles
      let best: CandidateShift | null = null;
      let bestScore = -Infinity;

      for (const worker of workers) {
        const rt = runtime.get(worker.id);
        if (!rt) continue;
        const workerMaxMinutes = worker.maxWeeklyHours * 60;

        const list = getCandidates(worker, day);
        for (const cand of list) {
          if (cand.zone !== req.zone) continue;
          if (!req.acceptedRoles.includes(cand.role)) continue;
          if (cand.startMinute > slotStart) continue;
          if (cand.endMinute <= slotStart) continue;

          const duration = cand.endMinute - cand.startMinute;

          // Per-worker hours.
          if (rt.minutesAssigned + duration > workerMaxMinutes) continue;

          // Per-worker double-booking.
          const intervals = rt.bookings.get(cand.date) ?? [];
          if (overlapsAny(intervals, cand.startMinute, cand.endMinute)) continue;

          // Score candidate.
          const score = scoreCandidate(
            cand.startMinute,
            cand.endMinute,
            cand.zone,
            cand.role,
            {
              workerMinutesSoFar: rt.minutesAssigned,
              workerMaxMinutes,
              fairShareMinutes,
            },
          );
          if (score > bestScore) {
            bestScore = score;
            best = cand;
          }
        }
      }

      if (!best) {
        // Leave this slot unsatisfied. Continue walking — next slot may be
        // covered by a previously placed shift.
        continue;
      }

      // Place the shift.
      const rt = runtime.get(best.workerId);
      if (!rt) continue;
      const intervals = rt.bookings.get(best.date) ?? [];
      intervals.push([best.startMinute, best.endMinute]);
      rt.bookings.set(best.date, intervals);
      rt.minutesAssigned += best.endMinute - best.startMinute;

      assignments.push({
        workerId: best.workerId,
        date: best.date,
        startMinute: best.startMinute,
        endMinute: best.endMinute,
        zone: best.zone,
        role: best.role,
        pinned: false,
        segmentGroupId: best.segmentGroupId,
      });

      // Mark satisfaction across ALL requirements this shift covers (a single
      // waiter shift on planta_0 covers floor; cook shift covers kitchen).
      for (const r2 of requirements) {
        if (r2.date !== best.date) continue;
        if (r2.zone !== best.zone) continue;
        if (!r2.acceptedRoles.includes(best.role)) continue;
        const k2 = makeSatisfiedKey(r2.date, r2.kind, r2.zone);
        markSatisfied(satisfied, k2, best.startMinute, best.endMinute, r2.startMinute);
      }

      // If this was a handoff segment, try to place its sibling immediately
      // so the worker actually transitions to terraza.
      if (best.segmentGroupId) {
        const list = getCandidates(rt.worker, day);
        const sibling = list.find(
          (c) =>
            c.segmentGroupId === best?.segmentGroupId &&
            c.zone !== best?.zone,
        );
        if (sibling) {
          const dur2 = sibling.endMinute - sibling.startMinute;
          const rt2 = rt;
          const intervals2 = rt2.bookings.get(sibling.date) ?? [];
          if (
            rt2.minutesAssigned + dur2 <= rt2.worker.maxWeeklyHours * 60 &&
            !overlapsAny(intervals2, sibling.startMinute, sibling.endMinute)
          ) {
            intervals2.push([sibling.startMinute, sibling.endMinute]);
            rt2.bookings.set(sibling.date, intervals2);
            rt2.minutesAssigned += dur2;
            assignments.push({
              workerId: sibling.workerId,
              date: sibling.date,
              startMinute: sibling.startMinute,
              endMinute: sibling.endMinute,
              zone: sibling.zone,
              role: sibling.role,
              pinned: false,
              segmentGroupId: sibling.segmentGroupId,
            });
            for (const r2 of requirements) {
              if (r2.date !== sibling.date) continue;
              if (r2.zone !== sibling.zone) continue;
              if (!r2.acceptedRoles.includes(sibling.role)) continue;
              const k2 = makeSatisfiedKey(r2.date, r2.kind, r2.zone);
              markSatisfied(
                satisfied,
                k2,
                sibling.startMinute,
                sibling.endMinute,
                r2.startMinute,
              );
            }
          }
        }
      }
    }
  }

  // Build unsatisfied report.
  const unsatisfied: PropagateResult["unsatisfied"] = [];
  for (const req of requirements) {
    const key = makeSatisfiedKey(req.date, req.kind, req.zone);
    const slots = satisfied.get(key);
    if (!slots) continue;
    if (slots.some((v) => v === 0)) {
      unsatisfied.push({ requirement: req, slots });
    }
  }

  return { assignments, unsatisfied };
}
