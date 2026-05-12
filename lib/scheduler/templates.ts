/**
 * Standard shift templates used as soft preferences by the solver.
 *
 * Spec §4 soft preferences:
 *   - Opener:        06:00–15:00  (planta_0, waiter or cook)
 *   - Closer:        15:00–23:00  (planta_0, waiter or cook)
 *   - Cook 2nd:      14:00–23:00 or 15:00–23:00 (cook)
 *   - Summer handoff: planta_0 06:00–11:00 → terraza 11:00–[shift end]
 *
 * Hard times can deviate (we still fill gaps with shorter custom shifts), but
 * we prefer these because they match the manager's mental model.
 */

import type { WorkerRoleLiteral, ZoneLiteral } from "@/lib/constants";

export interface ShiftTemplate {
  id: string;
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  /** Which roles this template is meaningful for. */
  appliesTo: ReadonlyArray<WorkerRoleLiteral>;
  /** Score boost when assignment matches this template. */
  bonus: number;
}

export const TEMPLATES: ReadonlyArray<ShiftTemplate> = [
  {
    id: "opener-06-15",
    startMinute: 360, // 06:00
    endMinute: 900, // 15:00
    zone: "planta_0",
    appliesTo: ["camarero", "ayudante_camarero", "cocinero", "ayudante_cocinero"],
    bonus: 4,
  },
  {
    id: "morning-08-16",
    startMinute: 480, // 08:00
    endMinute: 960, // 16:00
    zone: "planta_0",
    appliesTo: ["camarero", "ayudante_camarero"],
    bonus: 3,
  },
  {
    id: "closer-15-23",
    startMinute: 900, // 15:00
    endMinute: 1380, // 23:00
    zone: "planta_0",
    appliesTo: ["camarero", "ayudante_camarero", "cocinero", "ayudante_cocinero"],
    bonus: 4,
  },
  {
    id: "cook-14-22",
    startMinute: 840, // 14:00
    endMinute: 1320, // 22:00
    zone: "planta_0",
    appliesTo: ["cocinero", "ayudante_cocinero"],
    bonus: 3,
  },
  {
    id: "terraza-11-19",
    startMinute: 660, // 11:00
    endMinute: 1140, // 19:00
    zone: "terraza",
    appliesTo: ["camarero", "ayudante_camarero"],
    bonus: 2,
  },
  {
    id: "terraza-15-23",
    startMinute: 900, // 15:00
    endMinute: 1380, // 23:00
    zone: "terraza",
    appliesTo: ["camarero", "ayudante_camarero"],
    bonus: 3,
  },
];

/** Summer handoff: a worker starts on planta_0 at 06:00 or 08:00 and moves to terraza at 11:00 until end. */
export const HANDOFF_SEGMENTS: ReadonlyArray<{
  zone: ZoneLiteral;
  startMinute: number;
  endMinute: number;
}> = [
  { zone: "planta_0", startMinute: 360, endMinute: 660 }, // 06–11
  { zone: "terraza", startMinute: 660, endMinute: 1380 }, // 11–23
];

/** Returns true if (startMinute, endMinute, zone) matches one of the templates. */
export function templateBonus(
  startMinute: number,
  endMinute: number,
  zone: ZoneLiteral,
  role: WorkerRoleLiteral,
): number {
  for (const t of TEMPLATES) {
    if (
      t.startMinute === startMinute &&
      t.endMinute === endMinute &&
      t.zone === zone &&
      t.appliesTo.includes(role)
    ) {
      return t.bonus;
    }
  }
  return 0;
}
