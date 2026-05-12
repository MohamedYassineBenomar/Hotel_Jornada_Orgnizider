"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app-shell/locale-provider";
import {
  formatIsoWeekKey,
  isoWeekShift,
  type IsoWeekKey,
  currentIsoWeekKey,
} from "@/lib/time/iso-week";

interface Props {
  current: IsoWeekKey;
}

export function WeekNav({ current }: Props) {
  const t = useT();
  const prev = isoWeekShift(current, -1);
  const next = isoWeekShift(current, 1);
  const today = currentIsoWeekKey();
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/horario/${formatIsoWeekKey(prev)}`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("schedule.nav.previous")}
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/horario/${formatIsoWeekKey(today)}`}>
          {t("schedule.nav.today")}
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/horario/${formatIsoWeekKey(next)}`}>
          {t("schedule.nav.next")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
