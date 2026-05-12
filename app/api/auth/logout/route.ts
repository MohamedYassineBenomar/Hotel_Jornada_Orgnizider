export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

export async function POST(): Promise<Response> {
  const session = await getSession();
  session.destroy();
  return new NextResponse(null, { status: 204 });
}
