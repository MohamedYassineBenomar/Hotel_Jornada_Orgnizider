"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Algo ha ido mal</h1>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
