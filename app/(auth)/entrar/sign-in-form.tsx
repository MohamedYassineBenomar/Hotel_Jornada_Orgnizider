"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface Props {
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
  sendingLabel: string;
  invalidEmailMessage: string;
}

export function SignInForm({
  emailLabel,
  emailPlaceholder,
  submitLabel,
  sendingLabel,
  invalidEmailMessage,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const schema = React.useMemo(
    () =>
      z.object({
        email: z.string().email(invalidEmailMessage),
      }),
    [invalidEmailMessage],
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>): Promise<void> {
    setPending(true);
    try {
      await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      router.push(`/entrar/revisa?email=${encodeURIComponent(values.email)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{emailLabel}</FormLabel>
            <FormControl>
              <Input
                type="email"
                autoComplete="email"
                placeholder={emailPlaceholder}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? sendingLabel : submitLabel}
      </Button>
    </Form>
  );
}
