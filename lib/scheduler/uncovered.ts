/**
 * Convert the propagator's "unsatisfied slots" output into UncoveredSlot rows
 * with human-readable Spanish reasons.
 *
 * Reason codes are stable identifiers; the dictionary maps them to es-ES.
 */

import { SLOT_MINUTES } from "@/lib/constants";
import { tFromDictionary, type TFn } from "@/lib/i18n/t";
import type { CoverageRequirement, UncoveredSlotOut, WorkerInput } from "./types";

interface BuildArgs {
  unsatisfied: Array<{
    requirement: CoverageRequirement;
    slots: Uint8Array;
  }>;
  workers: WorkerInput[];
  t: TFn;
}

/** Collapse consecutive unsatisfied slots into contiguous intervals. */
function collapseSlots(
  startMinute: number,
  slots: Uint8Array,
): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  let curStart: number | null = null;
  for (let i = 0; i < slots.length; i++) {
    const slotStart = startMinute + i * SLOT_MINUTES;
    if (slots[i] === 0) {
      if (curStart === null) curStart = slotStart;
    } else if (curStart !== null) {
      out.push({ start: curStart, end: slotStart });
      curStart = null;
    }
  }
  if (curStart !== null) {
    out.push({
      start: curStart,
      end: startMinute + slots.length * SLOT_MINUTES,
    });
  }
  return out;
}

/** Pick a reason code based on requirement kind + available worker pool. */
function pickReasonCode(
  req: CoverageRequirement,
  workers: WorkerInput[],
): string {
  // If nobody in the pool is even qualified for the role family, that's the
  // proximate cause. Otherwise we surface a generic "could not cover".
  const qualified = workers.filter((w) =>
    w.qualifiedRoles.some((r) => req.acceptedRoles.includes(r)),
  );
  if (qualified.length === 0) {
    if (req.kind === "floor") return "uncovered.reason.no_qualified_floor";
    if (req.kind === "kitchen") return "uncovered.reason.no_qualified_kitchen";
    return "uncovered.reason.no_qualified_terraza";
  }
  return "uncovered.reason.generic";
}

export function buildUncoveredSlots(args: BuildArgs): UncoveredSlotOut[] {
  const out: UncoveredSlotOut[] = [];
  for (const { requirement, slots } of args.unsatisfied) {
    const intervals = collapseSlots(requirement.startMinute, slots);
    if (intervals.length === 0) continue;
    const reasonCode = pickReasonCode(requirement, args.workers);
    const reasonEs = args.t(reasonCode);
    for (const itv of intervals) {
      out.push({
        date: requirement.date,
        startMinute: itv.start,
        endMinute: itv.end,
        zone: requirement.zone,
        requiredRole: requirement.primaryRole,
        reasonCode,
        reasonEs,
      });
    }
  }
  return out;
}

/** Convenience builder that loads the es-ES dictionary itself. */
export async function buildUncoveredWithDefaultLocale(
  unsatisfied: Array<{ requirement: CoverageRequirement; slots: Uint8Array }>,
  workers: WorkerInput[],
): Promise<UncoveredSlotOut[]> {
  const dict = (
    await import("@/messages/es-ES.json")
  ).default as Record<string, string>;
  const t: TFn = (key, vars) => tFromDictionary(dict, key, vars);
  return buildUncoveredSlots({ unsatisfied, workers, t });
}
