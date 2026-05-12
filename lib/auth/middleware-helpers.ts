/**
 * Server-side auth guards used by API route handlers and server components.
 */

import { getSession, type SessionData } from "./session";
import { AppError } from "@/lib/api/errors";

export interface AuthedSession {
  userId: string;
  restaurantId: string;
  role: "manager";
}

function isAuthed(s: SessionData): s is Required<Pick<SessionData, "userId" | "restaurantId" | "role">> {
  return Boolean(s.userId && s.restaurantId && s.role);
}

/** Throws AppError("UNAUTHORIZED") if no valid session. */
export async function requireSession(): Promise<AuthedSession> {
  const session = await getSession();
  if (!isAuthed(session)) {
    throw new AppError("UNAUTHORIZED", "Necesitas iniciar sesión.", 401);
  }
  return {
    userId: session.userId,
    restaurantId: session.restaurantId,
    role: session.role,
  };
}

/** Read session without throwing — useful for layout components. */
export async function tryGetAuthedSession(): Promise<AuthedSession | null> {
  const session = await getSession();
  if (!isAuthed(session)) return null;
  return {
    userId: session.userId,
    restaurantId: session.restaurantId,
    role: session.role,
  };
}
