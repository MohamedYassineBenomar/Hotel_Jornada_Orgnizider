"use client";

/**
 * Minimal headless toast. We avoid pulling Radix's full toast viewport — we
 * render a portal-anchored stack ourselves and expose `useToast()` and
 * `<Toaster />` mirroring the shadcn API surface used by callers.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ToastInput {
  id?: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  durationMs?: number;
}

interface ToastInternal extends Required<Omit<ToastInput, "variant" | "title" | "description" | "durationMs">> {
  title?: string;
  description?: string;
  variant: "default" | "destructive";
  durationMs: number;
}

type Listener = (toasts: ToastInternal[]) => void;

const toasts: ToastInternal[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function publish() {
  for (const fn of listeners) fn([...toasts]);
}

export function toast(input: ToastInput) {
  const t: ToastInternal = {
    id: input.id ?? `t${nextId++}`,
    title: input.title,
    description: input.description,
    variant: input.variant ?? "default",
    durationMs: input.durationMs ?? 3500,
  };
  toasts.push(t);
  publish();
  setTimeout(() => {
    const idx = toasts.findIndex((x) => x.id === t.id);
    if (idx >= 0) toasts.splice(idx, 1);
    publish();
  }, t.durationMs);
}

export function useToast() {
  const [list, setList] = React.useState<ToastInternal[]>([]);
  React.useEffect(() => {
    listeners.add(setList);
    setList([...toasts]);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return { toasts: list };
}

export function Toaster() {
  const { toasts } = useToast();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-md border bg-card p-3 text-sm shadow-md",
            t.variant === "destructive" &&
              "border-destructive bg-destructive text-destructive-foreground",
          )}
        >
          {t.title ? <div className="font-medium">{t.title}</div> : null}
          {t.description ? (
            <div className="text-muted-foreground">{t.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
