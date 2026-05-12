/**
 * iron-session helpers. The session payload is intentionally tiny: just IDs
 * and the role. Anything else is loaded fresh from the DB per request.
 */

import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

import { env } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export interface SessionData {
  userId?: string;
  restaurantId?: string;
  role?: "manager";
}

function options(): SessionOptions {
  return {
    cookieName: SESSION_COOKIE_NAME,
    password: env().SESSION_SECRET,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // 30 day rolling expiry.
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, options());
}
