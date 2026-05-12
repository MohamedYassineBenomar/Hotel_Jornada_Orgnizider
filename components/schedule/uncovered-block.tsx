"use client";

import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  reason: string;
  startLabel: string;
  endLabel: string;
}

export function UncoveredBlock({ reason, startLabel, endLabel }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-sm border border-destructive/60 bg-destructive/20 px-2 py-1 text-xs text-destructive">
          {startLabel}–{endLabel}
        </div>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
