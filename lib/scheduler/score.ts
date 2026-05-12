/**
 * Soft-preference scoring for candidate assignments.
 *
 * Higher = more preferred. The propagator picks the highest-scoring valid
 * candidate at each step; ties are broken by hours-balance (workers below
 * their fair share win).
 */

import type { WorkerRoleLiteral, ZoneLiteral } from "@/lib/constants";
import { templateBonus } from "./templates";

export interface ScoreContext {
  /** Worker's accumulated minutes this week so far. */
  workerMinutesSoFar: number;
  /** Worker's max minutes for the week. */
  workerMaxMinutes: number;
  /** Average minutes per worker (target for even distribution). */
  fairShareMinutes: number;
}

export function scoreCandidate(
  startMinute: number,
  endMinute: number,
  zone: ZoneLiteral,
  role: WorkerRoleLiteral,
  ctx: ScoreContext,
): number {
  let score = 10;

  // Template bonus.
  score += templateBonus(startMinute, endMinute, zone, role);

  // Even distribution. Workers below fair share get a small boost.
  const projected = ctx.workerMinutesSoFar + (endMinute - startMinute);
  if (projected <= ctx.fairShareMinutes) {
    score += 2;
  } else if (projected > ctx.fairShareMinutes + 120) {
    score -= 1;
  }

  // Penalize approaching the per-worker max.
  if (projected > ctx.workerMaxMinutes - 60) {
    score -= 2;
  }

  return score;
}
