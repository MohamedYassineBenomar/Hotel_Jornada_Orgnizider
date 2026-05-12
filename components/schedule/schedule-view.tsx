"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/app-shell/locale-provider";
import { AutofillButton } from "./autofill-button";
import { PublishButton } from "./publish-button";
import { ShiftEditorDialog } from "./shift-editor-dialog";
import {
  WeekGrid,
  type WeekGridShift,
  type WeekGridUncovered,
} from "./week-grid";
import { WeekNav } from "./week-nav";
import { ZoneFilter, type ZoneFilterValue } from "./zone-filter";
import type { IsoWeekKey } from "@/lib/time/iso-week";
import { WORKER_ROLES } from "@/lib/constants";

interface WorkerOption {
  id: string;
  displayName: string;
  qualifiedRoles: string[];
}

interface Violation {
  code: string;
  severity: "hard" | "soft";
  shiftIds: ReadonlyArray<string>;
}

interface Props {
  weekKey: IsoWeekKey;
  weekId: string;
  weekStatus: "draft" | "published";
  weekDates: ReadonlyArray<{ key: string; weekday: number }>;
  operatingHoursStart: number;
  operatingHoursEnd: number;
  workers: WorkerOption[];
  shifts: ReadonlyArray<{
    id: string;
    workerId: string;
    workerName: string;
    date: string;
    startMinute: number;
    endMinute: number;
    zone: "planta_0" | "terraza";
    role: (typeof WORKER_ROLES)[number];
    pinned: boolean;
  }>;
  uncovered: ReadonlyArray<WeekGridUncovered>;
  violations: ReadonlyArray<Violation>;
}

export function ScheduleView({
  weekKey,
  weekId,
  weekStatus,
  weekDates,
  operatingHoursStart,
  operatingHoursEnd,
  workers,
  shifts,
  uncovered,
  violations,
}: Props) {
  const t = useT();
  const [zoneFilter, setZoneFilter] = React.useState<ZoneFilterValue>("all");
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingShift, setEditingShift] = React.useState<
    | undefined
    | {
        id: string;
        workerId: string;
        date: string;
        startMinute: number;
        endMinute: number;
        zone: string;
        role: string;
        pinned: boolean;
      }
  >(undefined);

  const violationsByShift = React.useMemo(() => {
    const map = new Map<string, { hard: boolean; soft: boolean }>();
    for (const v of violations) {
      for (const id of v.shiftIds) {
        const cur = map.get(id) ?? { hard: false, soft: false };
        if (v.severity === "hard") cur.hard = true;
        else cur.soft = true;
        map.set(id, cur);
      }
    }
    return map;
  }, [violations]);

  const decoratedShifts: WeekGridShift[] = shifts.map((s) => {
    const vio = violationsByShift.get(s.id) ?? { hard: false, soft: false };
    return {
      ...s,
      hasHardViolation: vio.hard,
      hasSoftViolation: vio.soft,
    };
  });

  const hardCount = violations.filter((v) => v.severity === "hard").length;

  function openNew(): void {
    setEditingShift(undefined);
    setEditorOpen(true);
  }

  function openEdit(shiftId: string): void {
    const s = shifts.find((x) => x.id === shiftId);
    if (!s) return;
    setEditingShift({
      id: s.id,
      workerId: s.workerId,
      date: s.date,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      zone: s.zone,
      role: s.role,
      pinned: s.pinned,
    });
    setEditorOpen(true);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("schedule.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("schedule.week_label", {
              week: weekKey.isoWeek,
              year: weekKey.isoYear,
            })}{" "}
            ·{" "}
            <Badge
              variant={weekStatus === "published" ? "default" : "secondary"}
            >
              {t(`schedule.status.${weekStatus}`)}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WeekNav current={weekKey} />
          <ZoneFilter value={zoneFilter} onChange={setZoneFilter} />
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" />
            {t("shift.editor.title_new")}
          </Button>
          <AutofillButton weekId={weekId} hasExistingShifts={shifts.length > 0} />
          <PublishButton
            weekId={weekId}
            hardViolationCount={hardCount}
            isPublished={weekStatus === "published"}
          />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">
          {t("schedule.legend.role")}:
        </span>
        {WORKER_ROLES.map((r) => (
          <span key={r} className="flex items-center gap-1">
            <span
              className={`inline-block h-3 w-3 rounded ${
                {
                  camarero: "bg-role-camarero",
                  ayudante_camarero: "bg-role-ayudante_camarero",
                  cocinero: "bg-role-cocinero",
                  ayudante_cocinero: "bg-role-ayudante_cocinero",
                }[r]
              }`}
            />
            {t(`role.${r}`)}
          </span>
        ))}
      </div>

      <WeekGrid
        weekDates={weekDates}
        operatingHoursStart={operatingHoursStart}
        operatingHoursEnd={operatingHoursEnd}
        shifts={decoratedShifts}
        uncovered={uncovered}
        zoneFilter={zoneFilter}
        onShiftClick={openEdit}
      />

      <ShiftEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        weekId={weekId}
        workers={workers}
        initial={editingShift}
        defaultDate={weekDates[0]?.key}
      />
    </div>
  );
}
