import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-muted-foreground">No encontrado.</p>
      <Button asChild>
        <Link href="/">Volver</Link>
      </Button>
    </main>
  );
}
