import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { tryGetAuthedSession } from "@/lib/auth/middleware-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionary";
import { tFromDictionary } from "@/lib/i18n/t";
import {
  currentIsoWeekKey,
  formatIsoWeekKey,
} from "@/lib/time/iso-week";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await tryGetAuthedSession();
  if (!session) return null;
  const dict = await loadDictionary(DEFAULT_LOCALE);
  const t = (k: string, vars?: Record<string, string | number>) =>
    tFromDictionary(dict, k, vars);

  const key = currentIsoWeekKey();
  const week = await prisma.scheduleWeek.upsert({
    where: {
      restaurantId_isoYear_isoWeek: {
        restaurantId: session.restaurantId,
        isoYear: key.isoYear,
        isoWeek: key.isoWeek,
      },
    },
    update: {},
    create: {
      restaurantId: session.restaurantId,
      isoYear: key.isoYear,
      isoWeek: key.isoWeek,
    },
    include: {
      shifts: true,
      uncoveredSlots: true,
    },
  });

  const workersScheduled = new Set(week.shifts.map((s) => s.workerId)).size;
  const totalMinutes = week.shifts.reduce(
    (sum, s) => sum + (s.endMinute - s.startMinute),
    0,
  );
  const hoursAssigned = (totalMinutes / 60).toFixed(1);
  const coverageGaps = week.uncoveredSlots.length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.welcome")} · {formatIsoWeekKey(key)}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("dashboard.week.summary_title")}
          </CardTitle>
          <CardDescription>{formatIsoWeekKey(key)}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat label={t("dashboard.week.workers_scheduled")} value={workersScheduled} />
          <Stat label={t("dashboard.week.hours_assigned")} value={`${hoursAssigned} h`} />
          <Stat
            label={t("dashboard.week.coverage_gaps")}
            value={coverageGaps}
            tone={coverageGaps > 0 ? "destructive" : "default"}
          />
        </CardContent>
      </Card>

      <div>
        <Button asChild>
          <Link href="/horario">{t("dashboard.cta.view_schedule")}</Link>
        </Button>
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  tone?: "default" | "destructive";
}

function Stat({ label, value, tone = "default" }: StatProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          tone === "destructive"
            ? "mt-2 text-2xl font-semibold text-destructive"
            : "mt-2 text-2xl font-semibold"
        }
      >
        {value}
      </div>
    </div>
  );
}
