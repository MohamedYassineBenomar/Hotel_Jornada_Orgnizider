export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { handler } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";

export const DELETE = handler({ auth: true }, async ({ params, session }) => {
  // Make sure the vacation belongs to a worker of this restaurant.
  const block = await prisma.vacationBlock.findUnique({
    where: { id: params.vacationId },
    include: { worker: true },
  });
  if (!block || block.worker.restaurantId !== session.restaurantId) {
    throw new AppError("NOT_FOUND", "Bloque de vacaciones no encontrado.", 404);
  }
  if (block.workerId !== params.id) {
    throw new AppError("NOT_FOUND", "Bloque de vacaciones no encontrado.", 404);
  }
  await prisma.vacationBlock.delete({ where: { id: params.vacationId } });
  return new NextResponse(null, { status: 204 });
});
