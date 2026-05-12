"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <label
      className={cn(
        "relative inline-flex h-6 w-10 cursor-pointer items-center",
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.currentTarget.checked)}
        {...props}
      />
      <span className="absolute inset-0 rounded-full bg-input transition-colors peer-checked:bg-primary" />
      <span className="absolute left-0.5 inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform peer-checked:translate-x-4" />
    </label>
  ),
);
Switch.displayName = "Switch";

export { Switch };
