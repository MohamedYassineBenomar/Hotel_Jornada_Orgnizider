"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useT } from "@/components/app-shell/locale-provider";
import { WorkerCreateSchema, type WorkerCreateInput } from "@/lib/validation/workers";
import { WORKER_ROLES, ISO_WEEKDAYS } from "@/lib/constants";
import { toast } from "@/components/ui/toast";

interface Props {
  workerId?: string;
  defaultValues?: Partial<WorkerCreateInput>;
  onDone?: () => void;
}

export function WorkerForm({ workerId, defaultValues, onDone }: Props) {
  const router = useRouter();
  const t = useT();
  const [pending, setPending] = React.useState(false);

  const form = useForm<WorkerCreateInput>({
    resolver: zodResolver(WorkerCreateSchema),
    defaultValues: {
      displayName: defaultValues?.displayName ?? "",
      qualifiedRoles: defaultValues?.qualifiedRoles ?? [],
      maxWeeklyHours: defaultValues?.maxWeeklyHours ?? 40,
      fixedDaysOff: defaultValues?.fixedDaysOff ?? [],
      annualVacationDays: defaultValues?.annualVacationDays ?? 30,
    },
  });

  async function onSubmit(values: WorkerCreateInput): Promise<void> {
    setPending(true);
    try {
      const url = workerId ? `/api/workers/${workerId}` : "/api/workers";
      const method = workerId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
      toast({ title: t("settings.saved") });
      onDone?.();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="displayName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("worker.form.name_label")}</FormLabel>
            <FormControl>
              <Input placeholder={t("worker.form.name_placeholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="qualifiedRoles"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("worker.form.roles_label")}</FormLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WORKER_ROLES.map((role) => {
                const checked = field.value.includes(role);
                return (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const next = c
                          ? [...field.value, role]
                          : field.value.filter((r) => r !== role);
                        field.onChange(next);
                      }}
                    />
                    {t(`role.${role}`)}
                  </label>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="maxWeeklyHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("worker.form.max_hours_label")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={80}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.currentTarget.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="annualVacationDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("worker.form.vacation_label")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.currentTarget.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="fixedDaysOff"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("worker.form.days_off_label")}</FormLabel>
            <div className="flex flex-wrap gap-2">
              {ISO_WEEKDAYS.map((d) => {
                const checked = field.value.includes(d);
                return (
                  <label
                    key={d}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const next = c
                          ? [...field.value, d].sort()
                          : field.value.filter((x) => x !== d);
                        field.onChange(next);
                      }}
                    />
                    {t(`weekday.${d}`)}
                  </label>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onDone?.()}>
          {t("worker.form.cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {t("worker.form.submit")}
        </Button>
      </div>
    </Form>
  );
}
