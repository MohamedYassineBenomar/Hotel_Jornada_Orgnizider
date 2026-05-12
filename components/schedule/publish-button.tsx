"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/components/app-shell/locale-provider";
import { toast } from "@/components/ui/toast";

interface Props {
  weekId: string;
  hardViolationCount: number;
  isPublished: boolean;
}

export function PublishButton({ weekId, hardViolationCount, isPublished }: Props) {
  const router = useRouter();
  const t = useT();
  const [pending, setPending] = React.useState(false);
  const disabled = pending || hardViolationCount > 0 || isPublished;

  async function publish(): Promise<void> {
    setPending(true);
    try {
      const res = await fetch(`/api/schedule/weeks/${weekId}/publish`, {
        method: "POST",
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
      toast({ title: t("schedule.publish.success") });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const button = (
    <Button onClick={publish} disabled={disabled} size="sm" variant="default">
      {t("schedule.publish.cta")}
    </Button>
  );

  if (hardViolationCount === 0) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{button}</span>
        </TooltipTrigger>
        <TooltipContent>
          {t("schedule.publish.disabled_violations")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
