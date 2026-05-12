"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/components/app-shell/locale-provider";
import { toast } from "@/components/ui/toast";

interface Props {
  weekId: string;
  hasExistingShifts: boolean;
}

export function AutofillButton({ weekId, hasExistingShifts }: Props) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function run(overwrite: boolean): Promise<void> {
    setPending(true);
    try {
      const res = await fetch(`/api/schedule/weeks/${weekId}/autofill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite }),
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
      const data = (await res.json()) as {
        shiftsCreated: number;
        uncovered: unknown[];
        durationMs: number;
      };
      if (data.uncovered.length > 0) {
        toast({
          title: t("schedule.autofill.partial_done", {
            uncovered: data.uncovered.length,
          }),
        });
      } else {
        toast({
          title: t("schedule.autofill.empty_done", {
            ms: data.durationMs,
            created: data.shiftsCreated,
          }),
        });
      }
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function onClick(): void {
    if (hasExistingShifts) {
      setOpen(true);
    } else {
      void run(false);
    }
  }

  return (
    <>
      <Button onClick={onClick} disabled={pending} size="sm">
        <Sparkles className="mr-2 h-4 w-4" />
        {pending ? t("schedule.autofill.running") : t("schedule.autofill.cta")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("schedule.autofill.confirm_title")}</DialogTitle>
            <DialogDescription>
              {t("schedule.autofill.confirm_body")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("schedule.autofill.confirm_cancel")}
            </Button>
            <Button onClick={() => run(true)} disabled={pending}>
              {t("schedule.autofill.confirm_accept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
