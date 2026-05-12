import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TerraceSeasonForm } from "@/components/settings/terrace-season-form";
import { tryGetAuthedSession } from "@/lib/auth/middleware-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionary";
import { tFromDictionary } from "@/lib/i18n/t";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const session = await tryGetAuthedSession();
  if (!session) return null;
  const [dict, restaurant] = await Promise.all([
    loadDictionary(DEFAULT_LOCALE),
    prisma.restaurant.findUnique({ where: { id: session.restaurantId } }),
  ]);
  if (!restaurant) return null;
  const t = (k: string) => tFromDictionary(dict, k);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6 md:p-10">
      <header>
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("app.name")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TerraceSeasonForm
            initial={{
              name: restaurant.name,
              operatingHoursStart: restaurant.operatingHoursStart,
              operatingHoursEnd: restaurant.operatingHoursEnd,
              terraceSeasonMonths: restaurant.terraceSeasonMonths,
              terraceHoursStart: restaurant.terraceHoursStart,
              terraceHoursEnd: restaurant.terraceHoursEnd,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
