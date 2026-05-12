import { z } from "zod";

import { WORKER_ROLES } from "@/lib/constants";

export const WorkerRoleSchema = z.enum(WORKER_ROLES);

export const WorkerCreateSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  qualifiedRoles: z.array(WorkerRoleSchema).min(1, "Mínimo un rol"),
  maxWeeklyHours: z.number().int().min(1).max(80),
  fixedDaysOff: z.array(z.number().int().min(1).max(7)).max(7),
  annualVacationDays: z.number().int().min(0).max(60),
});

export const WorkerUpdateSchema = WorkerCreateSchema.partial().extend({
  archivedAt: z.union([z.string().datetime(), z.null()]).optional(),
});

export type WorkerCreateInput = z.infer<typeof WorkerCreateSchema>;
export type WorkerUpdateInput = z.infer<typeof WorkerUpdateSchema>;
