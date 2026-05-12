import { z } from "zod";

export const SettingsUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  operatingHoursStart: z.number().int().min(0).max(1440).optional(),
  operatingHoursEnd: z.number().int().min(0).max(1440).optional(),
  terraceSeasonMonths: z
    .array(z.number().int().min(1).max(12))
    .max(12)
    .optional(),
  terraceHoursStart: z.number().int().min(0).max(1440).optional(),
  terraceHoursEnd: z.number().int().min(0).max(1440).optional(),
});

export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>;
