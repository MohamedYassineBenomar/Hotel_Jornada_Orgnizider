import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Singleton Restaurant: every operational entity scopes to this row in v1.
  const restaurant = await prisma.restaurant.upsert({
    where: { id: "default-restaurant" },
    update: {},
    create: {
      id: "default-restaurant",
      name: "Hotel Restaurante Barcelona",
      timezone: "Europe/Madrid",
      operatingHoursStart: 360,
      operatingHoursEnd: 1440,
      terraceSeasonMonths: [4, 5, 6, 7, 8, 9],
      terraceHoursStart: 660,
      terraceHoursEnd: 1380,
    },
  });

  // Demo manager — no password. Auth is magic-link only.
  const managerEmail = "demo@jornada.local";
  await prisma.user.upsert({
    where: { email: managerEmail },
    update: { restaurantId: restaurant.id },
    create: {
      email: managerEmail,
      role: "manager",
      restaurantId: restaurant.id,
    },
  });

  // Sample workers (8) to make the empty state feel less empty in dev.
  const workers = [
    {
      displayName: "María García",
      qualifiedRoles: ["camarero"] as const,
      maxWeeklyHours: 40,
      fixedDaysOff: [1],
      annualVacationDays: 30,
    },
    {
      displayName: "Jordi Puig",
      qualifiedRoles: ["camarero"] as const,
      maxWeeklyHours: 40,
      fixedDaysOff: [2],
      annualVacationDays: 30,
    },
    {
      displayName: "Lucía Romero",
      qualifiedRoles: ["camarero", "ayudante_camarero"] as const,
      maxWeeklyHours: 40,
      fixedDaysOff: [3],
      annualVacationDays: 30,
    },
    {
      displayName: "Carlos Vidal",
      qualifiedRoles: ["ayudante_camarero"] as const,
      maxWeeklyHours: 35,
      fixedDaysOff: [4],
      annualVacationDays: 28,
    },
    {
      displayName: "Ana Fernández",
      qualifiedRoles: ["ayudante_camarero", "camarero"] as const,
      maxWeeklyHours: 35,
      fixedDaysOff: [5],
      annualVacationDays: 28,
    },
    {
      displayName: "Iván Soler",
      qualifiedRoles: ["cocinero"] as const,
      maxWeeklyHours: 40,
      fixedDaysOff: [6],
      annualVacationDays: 30,
    },
    {
      displayName: "Marta Costa",
      qualifiedRoles: ["cocinero", "ayudante_cocinero"] as const,
      maxWeeklyHours: 40,
      fixedDaysOff: [7],
      annualVacationDays: 30,
    },
    {
      displayName: "Pere Mas",
      qualifiedRoles: ["ayudante_cocinero"] as const,
      maxWeeklyHours: 35,
      fixedDaysOff: [1],
      annualVacationDays: 28,
    },
  ];

  for (const w of workers) {
    await prisma.worker.upsert({
      where: {
        id: `seed-${w.displayName.replace(/\s+/g, "-").toLowerCase()}`,
      },
      update: {},
      create: {
        id: `seed-${w.displayName.replace(/\s+/g, "-").toLowerCase()}`,
        restaurantId: restaurant.id,
        displayName: w.displayName,
        qualifiedRoles: [...w.qualifiedRoles],
        maxWeeklyHours: w.maxWeeklyHours,
        fixedDaysOff: w.fixedDaysOff,
        annualVacationDays: w.annualVacationDays,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete. Restaurant=${restaurant.id} manager=${managerEmail}`,
  );
}

main()
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
