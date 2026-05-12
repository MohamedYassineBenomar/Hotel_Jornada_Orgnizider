export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * /verificar?token=... is a public alias for /api/auth/verify, kept so emails
 * shipped before the route refactor still resolve. We just forward.
 */
export function GET(req: NextRequest): NextResponse {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const redirect = new URL("/api/auth/verify", req.url);
  redirect.searchParams.set("token", token);
  return NextResponse.redirect(redirect);
}
