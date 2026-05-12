import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkerForm } from "@/components/workers/worker-form";
import { VacationBlocksPanel } from "@/components/workers/vacation-blocks-panel";
import { tryGetAuthedSession } from "@/lib/auth/middleware-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionary";
import { tFromDictionary } from "@/lib/i18n/t";
import type { WorkerCreateInput } from "@/lib/validation/workers";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkerEditPage({ params }: PageProps) {
  const { id } = await params;
  const session = await tryGetAuthedSession();
  if (!session) return null;
  const [dict, worker] = await Promise.all([
    loadDictionary(DEFAULT_LOCALE),
    prisma.worker.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { vacationBlocks: { orderBy: { startDate: "asc" } } },
    }),
  ]);
  if (!worker) notFound();
  const t = (k: string) => tFromDictionary(dict, k);

  const defaults: Partial<WorkerCreateInput> = {
    displayName: worker.displayName,
    qualifiedRoles: worker.qualifiedRoles,
    maxWeeklyHours: worker.maxWeeklyHours,
    fixedDaysOff: worker.fixedDaysOff,
    annualVacationDays: worker.annualVacationDays,
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{worker.displayName}</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/trabajadores">{t("common.back")}</Link>
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("workers.action.edit")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WorkerForm workerId={worker.id} defaultValues={defaults} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("vacation.title")}</CardTitle>
          <CardDescription>
            {t("vacation.summary.total")}: {worker.annualVacationDays}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VacationBlocksPanel
            workerId={worker.id}
            annualVacationDays={worker.annualVacationDays}
            blocks={worker.vacationBlocks.map((b) => ({
              id: b.id,
              startDate: b.startDate.toISOString().slice(0, 10),
              endDate: b.endDate.toISOString().slice(0, 10),
              note: b.note,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
