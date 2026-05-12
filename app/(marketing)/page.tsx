import Link from "next/link";

import { Button } from "@/components/ui/button";
import { loadDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { tFromDictionary } from "@/lib/i18n/t";

export default async function MarketingLanding() {
  const dict = await loadDictionary(DEFAULT_LOCALE);
  const t = (k: string) => tFromDictionary(dict, k);
  return (
    <main className="relative isolate flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <div className="text-lg font-semibold">{t("app.name")}</div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/entrar">{t("marketing.cta")}</Link>
        </Button>
      </header>
      <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Barcelona · {t("app.name")}
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          {t("marketing.title")}
        </h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          {t("marketing.subtitle")}
        </p>
        <Button asChild size="lg">
          <Link href="/entrar">{t("marketing.cta")}</Link>
        </Button>
      </section>
      <footer className="border-t px-8 py-6 text-center text-xs text-muted-foreground">
        {t("app.tagline")}
      </footer>
    </main>
  );
}
