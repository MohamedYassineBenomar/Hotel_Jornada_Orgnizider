import { redirect } from "next/navigation";

import { LocaleProvider } from "@/components/app-shell/locale-provider";
import { Sidebar } from "@/components/app-shell/sidebar";
import { TopNav } from "@/components/app-shell/top-nav";
import { tryGetAuthedSession } from "@/lib/auth/middleware-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await tryGetAuthedSession();
  if (!session) {
    redirect("/entrar");
  }

  const [user, dict] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    loadDictionary(DEFAULT_LOCALE),
  ]);

  if (!user) {
    redirect("/entrar");
  }

  return (
    <LocaleProvider dict={dict}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav email={user.email} />
          <main className="flex-1 bg-background">{children}</main>
        </div>
      </div>
    </LocaleProvider>
  );
}
