"use client";

import * as React from "react";

import { type Dictionary } from "@/lib/i18n/dictionary";
import { createT, type TFn } from "@/lib/i18n/t";

interface LocaleContextValue {
  t: TFn;
  dict: Dictionary;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

interface ProviderProps {
  dict: Dictionary;
  children: React.ReactNode;
}

export function LocaleProvider({ dict, children }: ProviderProps) {
  const value = React.useMemo<LocaleContextValue>(
    () => ({ dict, t: createT(dict) }),
    [dict],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT(): TFn {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be inside LocaleProvider");
  return ctx.t;
}
