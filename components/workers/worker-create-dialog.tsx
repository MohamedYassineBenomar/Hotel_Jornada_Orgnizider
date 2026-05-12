"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/components/app-shell/locale-provider";

import { WorkerForm } from "./worker-form";

export function WorkerCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("workers.new")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("workers.new")}</DialogTitle>
        </DialogHeader>
        <WorkerForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
