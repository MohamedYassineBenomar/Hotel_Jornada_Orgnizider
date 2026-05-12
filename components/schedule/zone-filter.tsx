"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app-shell/locale-provider";
import { cn } from "@/lib/utils";

export type ZoneFilterValue = "all" | "planta_0" | "terraza";

interface Props {
  value: ZoneFilterValue;
  onChange: (next: ZoneFilterValue) => void;
}

export function ZoneFilter({ value, onChange }: Props) {
  const t = useT();
  const options: Array<{ key: ZoneFilterValue; label: string }> = [
    { key: "all", label: t("zone.all") },
    { key: "planta_0", label: t("zone.planta_0") },
    { key: "terraza", label: t("zone.terraza") },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-md border bg-card p-1">
      {options.map((o) => (
        <Button
          key={o.key}
          variant={value === o.key ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-7 px-3 text-xs",
            value === o.key ? "" : "text-muted-foreground",
          )}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
