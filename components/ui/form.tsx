"use client";

/**
 * Minimal Form wrapper bridging React Hook Form + Zod, mirroring the parts
 * of shadcn's `<Form>` we actually use (FormField, FormItem, FormLabel,
 * FormControl, FormMessage). Kept light to avoid pulling extra Radix bits.
 */

import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormProps<T extends FieldValues>
  extends React.FormHTMLAttributes<HTMLFormElement> {
  form: UseFormReturn<T>;
  // children is intentionally inherited from FormHTMLAttributes for type clarity.
}

export function Form<T extends FieldValues>({
  form,
  children,
  ...props
}: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form {...props}>{children}</form>
    </FormProvider>
  );
}

interface FormFieldContextValue {
  name: string;
}
const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

interface FormItemContextValue {
  id: string;
}
const FormItemContext = React.createContext<FormItemContextValue | null>(null);

export function FormField<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
>({ ...props }: ControllerProps<T, N>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

export function FormLabel(props: React.ComponentProps<typeof Label>) {
  const ctx = React.useContext(FormItemContext);
  return <Label htmlFor={ctx?.id} {...props} />;
}

export function FormControl({
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(FormItemContext);
  return <div {...props} id={ctx?.id} />;
}

export function FormMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const field = React.useContext(FormFieldContext);
  const form = useFormContext();
  const error = field ? (form.formState.errors[field.name] as
    | { message?: string }
    | undefined) : undefined;
  const message = error?.message ?? children;
  if (!message) return null;
  return (
    <p className={cn("text-sm text-destructive", className)} {...props}>
      {String(message)}
    </p>
  );
}

export function useForm() {
  return useFormContext();
}
