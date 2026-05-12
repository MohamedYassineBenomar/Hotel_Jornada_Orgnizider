"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/app-shell/locale-provider";
import { toast } from "@/components/ui/toast";
import { WORKER_ROLES, ZONES } from "@/lib/constants";
import { parseHmToMinutes, formatMinutes } from "@/lib/time/minutes";

interface WorkerOption {
  id: string;
  displayName: string;
  qualifiedRoles: string[];
}

interface InitialShift {
  id: string;
  workerId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  zone: string;
  role: string;
  pinned: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: string;
  workers: WorkerOption[];
  initial?: InitialShift;
  defaultDate?: string;
}

const FormSchema = z
  .object({
    workerId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    startHm: z.string().regex(/^\d{2}:\d{2}$/u),
    endHm: z.string().regex(/^\d{2}:\d{2}$/u),
    zone: z.enum(ZONES),
    role: z.enum(WORKER_ROLES),
    pinned: z.boolean(),
  })
  .refine((v) => parseHmToMinutes(v.endHm) > parseHmToMinutes(v.startHm), {
    path: ["endHm"],
    message: "End must be after start",
  });

type FormValues = z.infer<typeof FormSchema>;

export function ShiftEditorDialog({
  open,
  onOpenChange,
  weekId,
  workers,
  initial,
  defaultDate,
}: Props) {
  const router = useRouter();
  const t = useT();
  const [pending, setPending] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      workerId: initial?.workerId ?? workers[0]?.id ?? "",
      date: initial?.date ?? defaultDate ?? "",
      startHm: formatMinutes(initial?.startMinute ?? 540),
      endHm: formatMinutes(initial?.endMinute ?? 900),
      zone: (initial?.zone as "planta_0" | "terraza") ?? "planta_0",
      role:
        (initial?.role as (typeof WORKER_ROLES)[number]) ??
        WORKER_ROLES[0],
      pinned: initial?.pinned ?? false,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        workerId: initial?.workerId ?? workers[0]?.id ?? "",
        date: initial?.date ?? defaultDate ?? "",
        startHm: formatMinutes(initial?.startMinute ?? 540),
        endHm: formatMinutes(initial?.endMinute ?? 900),
        zone: (initial?.zone as "planta_0" | "terraza") ?? "planta_0",
        role:
          (initial?.role as (typeof WORKER_ROLES)[number]) ??
          WORKER_ROLES[0],
        pinned: initial?.pinned ?? false,
      });
    }
  }, [open, initial, defaultDate, workers, form]);

  async function onSubmit(values: FormValues): Promise<void> {
    setPending(true);
    try {
      const startMinute = parseHmToMinutes(values.startHm);
      const endMinute = parseHmToMinutes(values.endHm);
      const payload = {
        scheduleWeekId: weekId,
        workerId: values.workerId,
        date: values.date,
        startMinute,
        endMinute,
        zone: values.zone,
        role: values.role,
        pinned: values.pinned,
      };
      const url = initial
        ? `/api/schedule/shifts/${initial.id}`
        : "/api/schedule/shifts";
      const method = initial ? "PATCH" : "POST";
      const body = initial
        ? {
            workerId: payload.workerId,
            date: payload.date,
            startMinute,
            endMinute,
            zone: payload.zone,
            role: payload.role,
            pinned: payload.pinned,
          }
        : payload;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: { messageEs?: string } };
        toast({
          variant: "destructive",
          title: t("common.error_generic"),
          description: data.error?.messageEs ?? "",
        });
        return;
      }
      onOpenChange(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onDelete(): Promise<void> {
    if (!initial) return;
    setPending(true);
    try {
      const res = await fetch(`/api/schedule/shifts/${initial.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: t("common.error_generic") });
        return;
      }
      onOpenChange(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial
              ? t("shift.editor.title_edit")
              : t("shift.editor.title_new")}
          </DialogTitle>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-3"
        >
          <FormField
            control={form.control}
            name="workerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("shift.editor.worker")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shift.editor.role")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORKER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {t(`role.${r}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shift.editor.zone")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          {t(`zone.${z}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vacation.column.start")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startHm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shift.editor.start")}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endHm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shift.editor.end")}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="pinned"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FormLabel>{t("shift.editor.pinned")}</FormLabel>
              </FormItem>
            )}
          />

          <DialogFooter className="gap-2">
            {initial ? (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={pending}
              >
                {t("shift.editor.delete")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("shift.editor.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("shift.editor.submit")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
