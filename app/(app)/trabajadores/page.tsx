import { Button } from "@/components/ui/button";
import { WorkersTable } from "@/components/workers/workers-table";
import { tryGetAuthedSession } from "@/lib/auth/middleware-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionary";
import { tFromDictionary } from "@/lib/i18n/t";
import { WorkerCreateDialog } from "@/components/workers/worker-create-dialog";

export const dynamic = "force-dynamic";

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ includeArchived?: string }>;
}) {
  const session = await tryGetAuthedSession();
  if (!session) return null;
  const sp = await searchParams;
  const includeArchived = sp.includeArchived === "true";
  const [dict, workers] = await Promise.all([
    loadDictionary(DEFAULT_LOCALE),
    prisma.worker.findMany({
      where: {
        restaurantId: session.restaurantId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      include: { vacationBlocks: true },
      orderBy: { displayName: "asc" },
    }),
  ]);
  const t = (k: string) => tFromDictionary(dict, k);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("workers.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("workers.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={
                includeArchived
                  ? "/trabajadores"
                  : "/trabajadores?includeArchived=true"
              }
            >
              {t("workers.show_archived")}
            </a>
          </Button>
          <WorkerCreateDialog />
        </div>
      </header>

      <WorkersTable workers={workers} />
    </div>
  );
}
