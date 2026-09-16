import type { ImportWarning } from "@/lib/recipe-import/types";

type ApiErrorBody = {
  error?: unknown;
  code?: unknown;
  retryable?: unknown;
  warnings?: unknown;
};

export class ClientApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryable: boolean;
  readonly warnings?: ImportWarning[];

  constructor(message: string, status: number, body: ApiErrorBody = {}) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.code = typeof body.code === "string" ? body.code : undefined;
    this.retryable = body.retryable === true;
    this.warnings = Array.isArray(body.warnings) ? body.warnings as ImportWarning[] : undefined;
  }
}

export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ClientApiError("Nätverksfelet kunde inte nå recepten.", 0, { retryable: true });
  }

  const body = await response.json().catch(() => ({})) as ApiErrorBody & T;
  if (!response.ok) {
    throw new ClientApiError(typeof body.error === "string" ? body.error : "Begäran kunde inte genomföras.", response.status, body);
  }
  return body as T;
}
