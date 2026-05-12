/**
 * Route handler wrapper.
 *
 *   export const POST = handler({ auth: true, body: someSchema }, async (ctx) => {
 *     ctx.session.restaurantId; // typed
 *     ctx.body; // parsed
 *     return Response.json(...);
 *   });
 *
 * The wrapper:
 *   - parses JSON body with Zod (if `body` schema given)
 *   - loads + scopes the session (if `auth: true`)
 *   - maps thrown AppError to the JSON envelope
 *   - logs duration for slow endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { z, type ZodTypeAny } from "zod";

import { requireSession, type AuthedSession } from "@/lib/auth/middleware-helpers";
import { AppError, toErrorBody } from "./errors";

type InferBody<B extends ZodTypeAny | undefined> = B extends ZodTypeAny
  ? z.infer<B>
  : undefined;

export interface BaseHandlerContext<B extends ZodTypeAny | undefined> {
  req: NextRequest;
  params: Record<string, string>;
  searchParams: URLSearchParams;
  body: InferBody<B>;
}

export interface AuthedHandlerContext<B extends ZodTypeAny | undefined>
  extends BaseHandlerContext<B> {
  session: AuthedSession;
}

type RouteHandlerArg = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

interface Options<B extends ZodTypeAny | undefined> {
  auth: boolean;
  body?: B;
}

export function handler<B extends ZodTypeAny | undefined = undefined>(
  options: Options<B> & { auth: true },
  fn: (ctx: AuthedHandlerContext<B>) => Promise<Response>,
): RouteHandlerArg;
export function handler<B extends ZodTypeAny | undefined = undefined>(
  options: Options<B> & { auth: false },
  fn: (ctx: BaseHandlerContext<B>) => Promise<Response>,
): RouteHandlerArg;
export function handler<B extends ZodTypeAny | undefined = undefined>(
  options: Options<B>,
  fn:
    | ((ctx: AuthedHandlerContext<B>) => Promise<Response>)
    | ((ctx: BaseHandlerContext<B>) => Promise<Response>),
): RouteHandlerArg {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    const start = Date.now();
    try {
      const params = ((await ctx.params) ?? {}) as Record<string, string>;

      // Parse body.
      let body: unknown = undefined;
      if (options.body) {
        let raw: unknown = undefined;
        if (req.method !== "GET" && req.method !== "DELETE") {
          try {
            raw = await req.json();
          } catch {
            throw new AppError("VALIDATION", "Cuerpo de la petición inválido.", 400);
          }
        }
        const parsed = options.body.safeParse(raw);
        if (!parsed.success) {
          const detail = parsed.error.issues
            .map((i) => `${i.path.join(".") || "_"}: ${i.message}`)
            .join("; ");
          throw new AppError("VALIDATION", `Datos inválidos: ${detail}`, 400);
        }
        body = parsed.data;
      }

      const searchParams = new URL(req.url).searchParams;

      const baseCtx: BaseHandlerContext<B> = {
        req,
        params,
        searchParams,
        body: body as InferBody<B>,
      };

      let res: Response;
      if (options.auth) {
        const session = await requireSession();
        const authedCtx: AuthedHandlerContext<B> = { ...baseCtx, session };
        res = await (fn as (ctx: AuthedHandlerContext<B>) => Promise<Response>)(
          authedCtx,
        );
      } else {
        res = await (fn as (ctx: BaseHandlerContext<B>) => Promise<Response>)(
          baseCtx,
        );
      }

      const dur = Date.now() - start;
      if (dur > 1500) {
        // eslint-disable-next-line no-console
        console.warn(`[api] slow ${req.method} ${req.nextUrl.pathname} ${dur}ms`);
      }
      return res;
    } catch (err: unknown) {
      const { status, body } = toErrorBody(err);
      return NextResponse.json(body, { status });
    }
  };
}
