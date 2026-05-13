import Link from "next/link";

import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionary";
import { tFromDictionary } from "@/lib/i18n/t";

import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dict = await loadDictionary(DEFAULT_LOCALE);
  const t = (k: string) => tFromDictionary(dict, k);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-1.5 text-center">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground"
          >
            {t("app.name")}
          </Link>
          <h1 className="text-xl font-semibold">{t("auth.signin.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.signin.subtitle")}
          </p>
        </div>
        {sp.error ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t("auth.verify.error")}
          </div>
        ) : null}
        <SignInForm
          emailLabel={t("auth.signin.email_label")}
          emailPlaceholder={t("auth.signin.email_placeholder")}
          submitLabel={t("auth.signin.submit")}
          sendingLabel={t("auth.signin.sending")}
          invalidEmailMessage={t("auth.signin.error_invalid_email")}
          dividerLabel={t("auth.signin.divider")}
          demoLabel={t("auth.signin.demo_cta")}
          demoHint={t("auth.signin.demo_hint")}
        />
      </div>
    </main>
  );
}
