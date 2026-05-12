/**
 * Edge middleware: gate the authed shell.
 *
 *  - Pass-through for marketing, auth, API.
 *  - For everything else, redirect to /entrar if the session cookie is absent.
 *  - We only check the cookie's *presence* here — the real unseal happens in
 *    Node route handlers via `getSession()` so we don't pull Prisma or iron-
 *    session into the edge bundle.
 */

import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

const APP_PREFIXES = [
  "/panel",
  "/trabajadores",
  "/horario",
  "/horas",
  "/ajustes",
];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (!APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!hasSession) {
    const target = new URL("/entrar", req.url);
    return NextResponse.redirect(target);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/trabajadores/:path*", "/horario/:path*", "/horas/:path*", "/ajustes/:path*"],
};
