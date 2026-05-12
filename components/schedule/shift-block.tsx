"use client";

/**
 * Tiny presentational component used by week-grid for cases where a shift
 * needs to be rendered independent of the grid (e.g. tooltip preview).
 */

import * as React from "react";

import { ROLE_COLOR_CLASS } from "@/lib/constants";
import type { WorkerRoleLiteral } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  workerName: string;
  role: WorkerRoleLiteral;
  zone: string;
  startLabel: string;
  endLabel: string;
}

export function ShiftBlock({ workerName, role, zone, startLabel, endLabel }: Props) {
  const colors = ROLE_COLOR_CLASS[role];
  return (
    <div className={cn("rounded-md px-2 py-1 text-xs", colors.bg, colors.fg)}>
      <div className="font-semibold">{workerName}</div>
      <div className="opacity-80">
        {role} · {zone}
      </div>
      <div className="opacity-80">
        {startLabel}–{endLabel}
      </div>
    </div>
  );
}
