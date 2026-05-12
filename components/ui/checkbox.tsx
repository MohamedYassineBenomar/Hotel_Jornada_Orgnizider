"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
    <label
      className={cn(
        "relative inline-flex h-5 w-5 cursor-pointer items-center justify-center",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.currentTarget.checked)}
        {...props}
      />
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded border border-input bg-background text-primary-foreground peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </label>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
