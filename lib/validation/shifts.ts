import { z } from "zod";

import { WORKER_ROLES, ZONES } from "@/lib/constants";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

export const ShiftCreateSchema = z
  .object({
    scheduleWeekId: z.string().min(1),
    workerId: z.string().min(1),
    date: isoDate,
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(0).max(1440),
    zone: z.enum(ZONES),
    role: z.enum(WORKER_ROLES),
    pinned: z.boolean().optional().default(false),
    segmentGroupId: z.string().optional().nullable(),
  })
  .refine((v) => v.endMinute > v.startMinute, {
    message: "endMinute debe ser mayor que startMinute",
    path: ["endMinute"],
  });

export const ShiftUpdateSchema = z
  .object({
    workerId: z.string().min(1).optional(),
    date: isoDate.optional(),
    startMinute: z.number().int().min(0).max(1440).optional(),
    endMinute: z.number().int().min(0).max(1440).optional(),
    zone: z.enum(ZONES).optional(),
    role: z.enum(WORKER_ROLES).optional(),
    pinned: z.boolean().optional(),
    segmentGroupId: z.string().optional().nullable(),
  })
  .refine(
    (v) =>
      v.startMinute === undefined ||
      v.endMinute === undefined ||
      v.endMinute > v.startMinute,
    {
      message: "endMinute debe ser mayor que startMinute",
      path: ["endMinute"],
    },
  );

export type ShiftCreateInput = z.infer<typeof ShiftCreateSchema>;
export type ShiftUpdateInput = z.infer<typeof ShiftUpdateSchema>;
