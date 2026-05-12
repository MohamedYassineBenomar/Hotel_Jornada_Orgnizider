"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/components/app-shell/locale-provider";
import { toast } from "@/components/ui/toast";

interface WorkerRow {
  id: string;
  displayName: string;
  qualifiedRoles: string[];
  maxWeeklyHours: number;
  fixedDaysOff: number[];
  annualVacationDays: number;
  archivedAt: Date | null;
  vacationBlocks: Array<{ startDate: Date; endDate: Date }>;
}

interface Props {
  workers: ReadonlyArray<WorkerRow>;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

export function WorkersTable({ workers }: Props) {
  const t = useT();
  const router = useRouter();

  async function archive(id: string, restore: boolean): Promise<void> {
    const res = await fetch(`/api/workers/${id}`, {
      method: restore ? "PATCH" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: restore ? JSON.stringify({ archivedAt: null }) : undefined,
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: t("common.error_generic") });
      return;
    }
    toast({ title: t("settings.saved") });
    router.refresh();
  }

  if (workers.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center">
        <h2 className="text-lg font-semibold">{t("workers.empty.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("workers.empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("workers.column.name")}</TableHead>
            <TableHead>{t("workers.column.roles")}</TableHead>
            <TableHead className="text-right">
              {t("workers.column.max_hours")}
            </TableHead>
            <TableHead>{t("workers.column.days_off")}</TableHead>
            <TableHead className="text-right">
              {t("workers.column.vacation_remaining")}
            </TableHead>
            <TableHead className="text-right">
              {t("workers.column.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.map((w) => {
            const used = w.vacationBlocks.reduce(
              (s, b) => s + daysBetween(new Date(b.startDate), new Date(b.endDate)),
              0,
            );
            const remaining = Math.max(0, w.annualVacationDays - used);
            return (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/trabajadores/${w.id}`}
                      className="font-medium hover:underline"
                    >
                      {w.displayName}
                    </Link>
                    {w.archivedAt ? (
                      <Badge variant="secondary">{t("workers.archived_label")}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {w.qualifiedRoles.map((r) => (
                      <Badge key={r} variant="outline">
                        {t(`role.${r}`)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">{w.maxWeeklyHours} h</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {w.fixedDaysOff.map((d) => (
                      <Badge key={d} variant="outline">
                        {t(`weekday.${d}`)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {remaining}/{w.annualVacationDays}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/trabajadores/${w.id}`}>
                        {t("workers.action.edit")}
                      </Link>
                    </Button>
                    {w.archivedAt ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archive(w.id, true)}
                      >
                        {t("workers.action.restore")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archive(w.id, false)}
                      >
                        {t("workers.action.archive")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
