"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useT } from "@/components/app-shell/locale-provider";
import {
  VacationCreateSchema,
  type VacationCreateInput,
} from "@/lib/validation/vacations";
import { toast } from "@/components/ui/toast";

interface Props {
  workerId: string;
  onDone?: () => void;
}

export function VacationBlockForm({ workerId, onDone }: Props) {
  const router = useRouter();
  const t = useT();
  const [pending, setPending] = React.useState(false);

  const form = useForm<VacationCreateInput>({
    resolver: zodResolver(VacationCreateSchema),
    defaultValues: { startDate: "", endDate: "", note: "" },
  });

  async function onSubmit(values: VacationCreateInput): Promise<void> {
    setPending(true);
    try {
      const res = await fetch(`/api/workers/${workerId}/vacations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
      onDone?.();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("vacation.form.start_label")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("vacation.form.end_label")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("vacation.form.note_label")}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {t("vacation.form.submit")}
        </Button>
      </div>
    </Form>
  );
}
