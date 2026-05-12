import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionary";
import { tFromDictionary } from "@/lib/i18n/t";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function CheckMailPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dict = await loadDictionary(DEFAULT_LOCALE);
  const t = (k: string) => tFromDictionary(dict, k);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm">
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-muted-foreground"
        >
          {t("app.name")}
        </Link>
        <h1 className="text-xl font-semibold">{t("auth.check.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.check.body")}</p>
        {sp.email ? (
          <p className="text-sm font-medium">{sp.email}</p>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href="/entrar">{t("auth.check.resend")}</Link>
        </Button>
      </div>
    </main>
  );
}
