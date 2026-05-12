/**
 * Compute the per-day coverage requirements the solver must satisfy.
 *
 * For each open day:
 *   - Floor (planta_0, waiter): 06:00 → 24:00 — at least one waiter on shift
 *   - Kitchen (planta_0, cook):  06:00 → 24:00 — at least one cook on shift
 *   - Terraza (terraza, waiter): 11:00 → 23:00 ONLY if isTerraceSeason
 *
 * The solver runs at half-hour granularity, so each "requirement" is the full
 * window but we'll check it slot-by-slot internally.
 */

import { FLOOR_ROLES, KITCHEN_ROLES } from "@/lib/constants";
import type {
  CoverageRequirement,
  DayInput,
  SchedulerSettings,
} from "./types";

export function buildCoverageRequirements(
  days: DayInput[],
  settings: SchedulerSettings,
): CoverageRequirement[] {
  const out: CoverageRequirement[] = [];

  for (const day of days) {
    out.push({
      date: day.date,
      startMinute: settings.operatingHoursStart,
      endMinute: settings.operatingHoursEnd,
      zone: "planta_0",
      acceptedRoles: FLOOR_ROLES,
      primaryRole: "camarero",
      kind: "floor",
    });
    out.push({
      date: day.date,
      startMinute: settings.operatingHoursStart,
      endMinute: settings.operatingHoursEnd,
      zone: "planta_0",
      acceptedRoles: KITCHEN_ROLES,
      primaryRole: "cocinero",
      kind: "kitchen",
    });
    if (day.isTerraceSeason) {
      out.push({
        date: day.date,
        startMinute: settings.terraceHoursStart,
        endMinute: settings.terraceHoursEnd,
        zone: "terraza",
        acceptedRoles: FLOOR_ROLES,
        primaryRole: "camarero",
        kind: "terraza",
      });
    }
  }
  return out;
}
