"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useT } from "@/components/app-shell/locale-provider";
import { toast } from "@/components/ui/toast";
import { SettingsUpdateSchema, type SettingsUpdateInput } from "@/lib/validation/settings";
import { formatMinutes, parseHmToMinutes } from "@/lib/time/minutes";

interface SettingsLike {
  name: string;
  operatingHoursStart: number;
  operatingHoursEnd: number;
  terraceSeasonMonths: number[];
  terraceHoursStart: number;
  terraceHoursEnd: number;
}

interface Props {
  initial: SettingsLike;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface FormState {
  name: string;
  openingHm: string;
  closingHm: string;
  terraceMonths: number[];
  terraceStartHm: string;
  terraceEndHm: string;
}

export function TerraceSeasonForm({ initial }: Props) {
  const router = useRouter();
  const t = useT();
  const [pending, setPending] = React.useState(false);

  const form = useForm<FormState>({
    defaultValues: {
      name: initial.name,
      openingHm: formatMinutes(initial.operatingHoursStart),
      closingHm: formatMinutes(initial.operatingHoursEnd),
      terraceMonths: initial.terraceSeasonMonths,
      terraceStartHm: formatMinutes(initial.terraceHoursStart),
      terraceEndHm: formatMinutes(initial.terraceHoursEnd),
    },
  });

  async function onSubmit(values: FormState): Promise<void> {
    setPending(true);
    try {
      const payload: SettingsUpdateInput = {
        name: values.name,
        operatingHoursStart: parseHmToMinutes(values.openingHm),
        operatingHoursEnd: parseHmToMinutes(values.closingHm),
        terraceSeasonMonths: values.terraceMonths.sort((a, b) => a - b),
        terraceHoursStart: parseHmToMinutes(values.terraceStartHm),
        terraceHoursEnd: parseHmToMinutes(values.terraceEndHm),
      };
      const parsed = SettingsUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        toast({ variant: "destructive", title: t("common.error_generic") });
        return;
      }
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { messageEs?: string } };
        toast({
          variant: "destructive",
          title: t("common.error_generic"),
          description: body.error?.messageEs ?? "",
        });
        return;
      }
      toast({ title: t("settings.saved") });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("settings.name_label")}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <FormLabel>{t("settings.operating_hours_label")}</FormLabel>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="openingHm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("settings.operating_hours_start")}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="closingHm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("settings.operating_hours_end")}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <FormField
        control={form.control}
        name="terraceMonths"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("settings.terrace_season_label")}</FormLabel>
            <p className="text-xs text-muted-foreground">
              {t("settings.terrace_months_help")}
            </p>
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((m) => {
                const checked = field.value.includes(m);
                return (
                  <label
                    key={m}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const next = c
                          ? [...field.value, m]
                          : field.value.filter((x) => x !== m);
                        field.onChange(next);
                      }}
                    />
                    {t(`month.${m}`)}
                  </label>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <FormLabel>{t("settings.terrace_hours_label")}</FormLabel>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="terraceStartHm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("settings.operating_hours_start")}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="terraceEndHm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("settings.operating_hours_end")}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {t("settings.submit")}
      </Button>
    </Form>
  );
}
