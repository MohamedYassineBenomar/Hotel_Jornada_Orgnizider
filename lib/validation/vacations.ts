import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Fecha debe ser YYYY-MM-DD");

export const VacationCreateSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    note: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "endDate no puede ser anterior a startDate",
    path: ["endDate"],
  });

export type VacationCreateInput = z.infer<typeof VacationCreateSchema>;
