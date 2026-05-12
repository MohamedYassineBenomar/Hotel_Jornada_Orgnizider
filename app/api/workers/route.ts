export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { WorkerCreateSchema } from "@/lib/validation/workers";

export const GET = handler({ auth: true }, async ({ session, searchParams }) => {
  const includeArchived = searchParams.get("includeArchived") === "true";
  const workers = await prisma.worker.findMany({
    where: {
      restaurantId: session.restaurantId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ displayName: "asc" }],
    include: {
      vacationBlocks: true,
    },
  });
  return NextResponse.json({ workers });
});

export const POST = handler(
  { auth: true, body: WorkerCreateSchema },
  async ({ session, body }) => {
    const created = await prisma.worker.create({
      data: {
        restaurantId: session.restaurantId,
        displayName: body!.displayName,
        qualifiedRoles: body!.qualifiedRoles,
        maxWeeklyHours: body!.maxWeeklyHours,
        fixedDaysOff: body!.fixedDaysOff,
        annualVacationDays: body!.annualVacationDays,
      },
    });
    return NextResponse.json({ worker: created }, { status: 201 });
  },
);
