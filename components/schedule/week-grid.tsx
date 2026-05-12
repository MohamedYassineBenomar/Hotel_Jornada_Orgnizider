"use client";

import * as React from "react";
import { Pin } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROLE_COLOR_CLASS, SLOTS_PER_DAY, SLOT_MINUTES } from "@/lib/constants";
import type { WorkerRoleLiteral, ZoneLiteral } from "@/lib/constants";
import { useT } from "@/components/app-shell/locale-provider";
import { formatMinutes } from "@/lib/time/minutes";
import { cn } from "@/lib/utils";

import type { ZoneFilterValue } from "./zone-filter";

export interface WeekGridShift {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  role: WorkerRoleLiteral;
  pinned: boolean;
  hasHardViolation: boolean;
  hasSoftViolation: boolean;
}

export interface WeekGridUncovered {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
  zone: ZoneLiteral;
  requiredRole: WorkerRoleLiteral;
  reasonEs: string;
}

interface Props {
  weekDates: ReadonlyArray<{ key: string; weekday: number }>;
  operatingHoursStart: number;
  operatingHoursEnd: number;
  shifts: ReadonlyArray<WeekGridShift>;
  uncovered: ReadonlyArray<WeekGridUncovered>;
  zoneFilter: ZoneFilterValue;
  onShiftClick?: (shiftId: string) => void;
}

interface BlockPosition {
  startSlot: number;
  endSlot: number;
}

function blockPosition(
  s: { startMinute: number; endMinute: number },
  start: number,
): BlockPosition {
  return {
    startSlot: Math.floor((s.startMinute - start) / SLOT_MINUTES),
    endSlot: Math.ceil((s.endMinute - start) / SLOT_MINUTES),
  };
}

export function WeekGrid({
  weekDates,
  operatingHoursStart,
  operatingHoursEnd,
  shifts,
  uncovered,
  zoneFilter,
  onShiftClick,
}: Props) {
  const t = useT();
  const totalSlots = Math.ceil(
    (operatingHoursEnd - operatingHoursStart) / SLOT_MINUTES,
  );
  const rowSlots = totalSlots > 0 ? totalSlots : SLOTS_PER_DAY;

  const labels: number[] = React.useMemo(() => {
    const out: number[] = [];
    for (let m = operatingHoursStart; m <= operatingHoursEnd; m += 60) {
      out.push(m);
    }
    return out;
  }, [operatingHoursStart, operatingHoursEnd]);

  const filteredShifts = shifts.filter((s) =>
    zoneFilter === "all" ? true : s.zone === zoneFilter,
  );
  const filteredUncovered = uncovered.filter((u) =>
    zoneFilter === "all" ? true : u.zone === zoneFilter,
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-auto rounded-lg border bg-card">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `64px repeat(${weekDates.length}, minmax(140px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="sticky left-0 z-10 border-b bg-card" />
          {weekDates.map((d) => (
            <div
              key={d.key}
              className="border-b border-l p-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <div>{t(`weekday.${d.weekday}`)}</div>
              <div className="text-foreground">{d.key.slice(5)}</div>
            </div>
          ))}

          {/* Body — one outer cell per day with a nested 36-row grid. Hour labels live in the first column. */}
          <div className="relative">
            <div
              className="grid"
              style={{
                gridTemplateRows: `repeat(${rowSlots}, 22px)`,
              }}
            >
              {Array.from({ length: rowSlots }).map((_, i) => {
                const minute = operatingHoursStart + i * SLOT_MINUTES;
                const isHour = minute % 60 === 0;
                return (
                  <div
                    key={i}
                    className={cn(
                      "relative border-t text-[10px] text-muted-foreground",
                      i === 0 && "border-t-0",
                      isHour ? "" : "border-t-transparent",
                    )}
                  >
                    {isHour ? (
                      <span className="absolute left-1 top-0">
                        {formatMinutes(minute)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {weekDates.map((day) => {
            const dayShifts = filteredShifts.filter((s) => s.date === day.key);
            const dayUncovered = filteredUncovered.filter(
              (u) => u.date === day.key,
            );
            return (
              <div key={day.key} className="relative border-l">
                <div
                  className="grid"
                  style={{
                    gridTemplateRows: `repeat(${rowSlots}, 22px)`,
                  }}
                >
                  {Array.from({ length: rowSlots }).map((_, i) => {
                    const isHour =
                      (operatingHoursStart + i * SLOT_MINUTES) % 60 === 0;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-t",
                          i === 0 && "border-t-0",
                          isHour ? "" : "border-t-dashed border-t-muted/60",
                        )}
                      />
                    );
                  })}
                </div>
                {/* Uncovered slots (rendered behind shifts so shifts can overwrite if both exist). */}
                {dayUncovered.map((u) => {
                  const pos = blockPosition(u, operatingHoursStart);
                  return (
                    <Tooltip key={u.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute left-0.5 right-0.5 rounded-sm border border-destructive/60 bg-destructive/20 px-1 py-0.5 text-[10px] text-destructive shadow-sm"
                          style={{
                            top: `${pos.startSlot * 22 + 2}px`,
                            height: `${(pos.endSlot - pos.startSlot) * 22 - 4}px`,
                          }}
                        >
                          <div className="font-semibold uppercase tracking-wide">
                            {t(`role.${u.requiredRole}`)}
                          </div>
                          <div>
                            {formatMinutes(u.startMinute)}–
                            {formatMinutes(u.endMinute)}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("schedule.uncovered.tooltip", { reason: u.reasonEs })}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {/* Shift blocks. */}
                {dayShifts.map((s) => {
                  const pos = blockPosition(s, operatingHoursStart);
                  const colors = ROLE_COLOR_CLASS[s.role];
                  return (
                    <button
                      key={s.id}
                      onClick={() => onShiftClick?.(s.id)}
                      className={cn(
                        "absolute left-1 right-1 flex flex-col gap-0.5 rounded-md px-2 py-1 text-left text-[11px] shadow-sm transition-colors",
                        colors.bg,
                        colors.fg,
                        s.hasHardViolation &&
                          "ring-2 ring-destructive ring-offset-1",
                        s.hasSoftViolation &&
                          !s.hasHardViolation &&
                          "ring-2 ring-amber-400 ring-offset-1",
                      )}
                      style={{
                        top: `${pos.startSlot * 22 + 2}px`,
                        height: `${(pos.endSlot - pos.startSlot) * 22 - 4}px`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate font-semibold">
                          {s.workerName}
                        </span>
                        {s.pinned ? (
                          <Pin className="h-3 w-3 shrink-0" aria-hidden />
                        ) : null}
                      </div>
                      <div className="truncate text-[10px] opacity-90">
                        {t(`role.${s.role}`)} · {t(`zone.${s.zone}`)}
                      </div>
                      <div className="text-[10px] opacity-80">
                        {formatMinutes(s.startMinute)}–
                        {formatMinutes(s.endMinute)}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
