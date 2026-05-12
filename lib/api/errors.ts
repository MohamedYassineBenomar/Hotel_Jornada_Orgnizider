/**
 * Application error envelope. Every route handler emits the same shape:
 *   { error: { code: string, messageEs: string } }
 */

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;
  public readonly messageEs: string;

  constructor(code: AppErrorCode, messageEs: string, status = 400) {
    super(messageEs);
    this.code = code;
    this.messageEs = messageEs;
    this.status = status;
  }
}

export interface AppErrorBody {
  error: { code: AppErrorCode; messageEs: string };
}

export function toErrorBody(err: unknown): { status: number; body: AppErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { error: { code: err.code, messageEs: err.messageEs } },
    };
  }
  // eslint-disable-next-line no-console
  console.error("[api] unexpected error", err);
  return {
    status: 500,
    body: {
      error: { code: "INTERNAL", messageEs: "Error interno del servidor." },
    },
  };
}
