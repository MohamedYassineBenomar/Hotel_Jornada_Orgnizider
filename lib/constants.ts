/**
 * Role / zone enum mirrors and runtime defaults.
 *
 * The Prisma enums live in `prisma/schema.prisma`. We mirror them here as
 * `as const` tuples so client code that cannot import `@prisma/client` (edge
 * runtime, browser bundles) still has the canonical list.
 */

export const WORKER_ROLES = [
  "camarero",
  "ayudante_camarero",
  "cocinero",
  "ayudante_cocinero",
] as const;

export type WorkerRoleLiteral = (typeof WORKER_ROLES)[number];

export const ZONES = ["planta_0", "terraza"] as const;
export type ZoneLiteral = (typeof ZONES)[number];

export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type IsoWeekday = (typeof ISO_WEEKDAYS)[number];

/**
 * Roles that are allowed in each zone. Cooks never on terraza (spec §4 #4).
 */
export const ZONE_ROLE_MAP: Record<ZoneLiteral, ReadonlyArray<WorkerRoleLiteral>> = {
  planta_0: ["camarero", "ayudante_camarero", "cocinero", "ayudante_cocinero"],
  terraza: ["camarero", "ayudante_camarero"],
};

/** Floor-coverage roles (waiters). */
export const FLOOR_ROLES: ReadonlyArray<WorkerRoleLiteral> = [
  "camarero",
  "ayudante_camarero",
];

/** Kitchen-coverage roles (cooks). */
export const KITCHEN_ROLES: ReadonlyArray<WorkerRoleLiteral> = [
  "cocinero",
  "ayudante_cocinero",
];

export const DEFAULT_OPERATING_HOURS = {
  startMinute: 360, // 06:00
  endMinute: 1440, // 24:00
};

export const DEFAULT_TERRACE_HOURS = {
  startMinute: 660, // 11:00
  endMinute: 1380, // 23:00
};

export const DEFAULT_TERRACE_MONTHS = [4, 5, 6, 7, 8, 9] as const;

export const SLOT_MINUTES = 30;

/** Granularity of a half-hour: there are 36 slots in 06:00–24:00. */
export const SLOTS_PER_DAY = (1440 - 360) / SLOT_MINUTES;

/** Tailwind role color class lookup. */
export const ROLE_COLOR_CLASS: Record<
  WorkerRoleLiteral,
  { bg: string; fg: string; bgHex: string }
> = {
  camarero: {
    bg: "bg-role-camarero",
    fg: "text-role-camarero-fg",
    bgHex: "hsl(210 76% 56%)",
  },
  ayudante_camarero: {
    bg: "bg-role-ayudante_camarero",
    fg: "text-role-ayudante_camarero-fg",
    bgHex: "hsl(198 70% 76%)",
  },
  cocinero: {
    bg: "bg-role-cocinero",
    fg: "text-role-cocinero-fg",
    bgHex: "hsl(340 65% 50%)",
  },
  ayudante_cocinero: {
    bg: "bg-role-ayudante_cocinero",
    fg: "text-role-ayudante_cocinero-fg",
    bgHex: "hsl(340 60% 80%)",
  },
};

/** Session cookie name (kept in one place for middleware + handlers). */
export const SESSION_COOKIE_NAME = "jornada_session";

/** Magic-link token TTL in minutes. */
export const MAGIC_LINK_TTL_MINUTES = 15;

/** Solver wall-clock budget. */
export const SOLVER_TIMEOUT_MS = 10_000;

/** Soft-warning thresholds. */
export const SHIFT_MIN_HOURS = 4;
export const SHIFT_MAX_HOURS = 10;
export const NEAR_MAX_HOURS_BUFFER = 1;
