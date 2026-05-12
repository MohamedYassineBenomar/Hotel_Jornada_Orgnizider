"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/app-shell/locale-provider";

export interface SummaryRow {
  workerId: string;
  displayName: string;
  hoursWeek: number;
  hoursMonth: number;
  daysWorked: number;
  vacationUsedYTD: number;
  vacationRemaining: number;
  annualVacationDays: number;
  draftIncluded: boolean;
}

interface Props {
  rows: ReadonlyArray<SummaryRow>;
}

export function HoursTable({ rows }: Props) {
  const t = useT();
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("hours.column.worker")}</TableHead>
            <TableHead className="text-right">{t("hours.column.hours_week")}</TableHead>
            <TableHead className="text-right">{t("hours.column.hours_month")}</TableHead>
            <TableHead className="text-right">{t("hours.column.days_worked")}</TableHead>
            <TableHead className="text-right">{t("hours.column.vacation_used")}</TableHead>
            <TableHead className="text-right">{t("hours.column.vacation_remaining")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.workerId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.displayName}</span>
                  {r.draftIncluded ? (
                    <Badge variant="secondary">{t("hours.label.provisional")}</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">{r.hoursWeek.toFixed(1)} h</TableCell>
              <TableCell className="text-right">{r.hoursMonth.toFixed(1)} h</TableCell>
              <TableCell className="text-right">{r.daysWorked}</TableCell>
              <TableCell className="text-right">{r.vacationUsedYTD}</TableCell>
              <TableCell className="text-right">
                {r.vacationRemaining}/{r.annualVacationDays}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
