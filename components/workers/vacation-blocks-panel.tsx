"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

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

import { VacationBlockForm } from "./vacation-block-form";

interface BlockRow {
  id: string;
  startDate: string;
  endDate: string;
  note: string | null;
}

interface Props {
  workerId: string;
  annualVacationDays: number;
  blocks: ReadonlyArray<BlockRow>;
}

function daysBetween(a: string, b: string): number {
  const sa = new Date(`${a}T00:00:00Z`);
  const sb = new Date(`${b}T00:00:00Z`);
  return Math.floor((sb.getTime() - sa.getTime()) / 86_400_000) + 1;
}

export function VacationBlocksPanel({
  workerId,
  annualVacationDays,
  blocks,
}: Props) {
  const router = useRouter();
  const t = useT();
  const used = blocks.reduce((s, b) => s + daysBetween(b.startDate, b.endDate), 0);
  const remaining = Math.max(0, annualVacationDays - used);

  async function remove(id: string): Promise<void> {
    const res = await fetch(`/api/workers/${workerId}/vacations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: t("common.error_generic") });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/40 p-3 text-sm">
        <span>
          {t("vacation.summary.total")}:{" "}
          <strong>{annualVacationDays}</strong>
        </span>
        <span>
          {t("vacation.summary.used")}: <strong>{used}</strong>
        </span>
        <span>
          {t("vacation.summary.remaining")}: <strong>{remaining}</strong>
        </span>
      </div>

      <VacationBlockForm workerId={workerId} />

      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("vacation.empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("vacation.column.start")}</TableHead>
              <TableHead>{t("vacation.column.end")}</TableHead>
              <TableHead className="text-right">
                {t("vacation.column.days")}
              </TableHead>
              <TableHead>{t("vacation.column.note")}</TableHead>
              <TableHead className="text-right">
                {t("vacation.column.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.startDate}</TableCell>
                <TableCell>{b.endDate}</TableCell>
                <TableCell className="text-right">
                  {daysBetween(b.startDate, b.endDate)}
                </TableCell>
                <TableCell>{b.note ?? ""}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(b.id)}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
