export type ApiFail = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiOk<T> = {
  ok: true;
  data: T;
};

export type ApiResponse<T> = ApiOk<T> | ApiFail;

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isApiOk(payload: ApiOk<unknown> | ApiFail): payload is ApiOk<unknown> {
  return payload.ok === true;
}

export async function parseApiJson(res: Response): Promise<ApiOk<unknown> | ApiFail> {
  try {
    const json = (await res.json()) as ApiOk<unknown> | ApiFail;
    if (json && typeof json === "object" && "ok" in json) {
      return json;
    }
    return {
      ok: false,
      error: { code: "invalid_response", message: "Invalid response payload" },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "invalid_json",
        message: "Invalid JSON",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function readOk<T>(res: Response): Promise<T> {
  const payload = await parseApiJson(res);
  if (res.ok && isApiOk(payload)) {
    return payload.data as T;
  }
  if (!isApiOk(payload)) {
    throw new ApiError(payload.error.code, payload.error.message, res.status, payload.error.details);
  }
  throw new ApiError("invalid_response", "Invalid response payload", res.status);
}

export function readNoContent(res: Response): void {
  if (res.status === 204) return;
  if (res.ok) return;
  throw new ApiError("invalid_response", "Expected no content response", res.status);
}

function buildJsonBody(body: unknown, init?: RequestInit): { body: BodyInit; init: RequestInit } {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return { body: JSON.stringify(body ?? {}), init: { ...init, headers } };
}

export async function apiGet<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, method: "GET" });
  return readOk<T>(res);
}

export async function apiPost<T>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
  if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
    const res = await fetch(url, { ...init, method: "POST", body });
    return readOk<T>(res);
  }
  const { body: jsonBody, init: nextInit } = buildJsonBody(body, init);
  const res = await fetch(url, { ...nextInit, method: "POST", body: jsonBody });
  return readOk<T>(res);
}

export async function apiDelete<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, method: "DELETE" });
  return readOk<T>(res);
}

export async function readRaw<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as T | { error?: string; message?: string } | null;
  if (res.ok) {
    if (json === null) {
      throw new ApiError("invalid_json", "Invalid JSON", res.status);
    }
    return json as T;
  }
  const message =
    json && typeof json === "object"
      ? (json as { message?: string; error?: string }).message ||
        (json as { message?: string; error?: string }).error
      : null;
  throw new ApiError("raw_error", message || "Ошибка", res.status, json);
}

export async function apiGetRaw<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, method: "GET" });
  return readRaw<T>(res);
}

export async function apiPostRaw<T>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
  if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
    const res = await fetch(url, { ...init, method: "POST", body });
    return readRaw<T>(res);
  }
  const { body: jsonBody, init: nextInit } = buildJsonBody(body, init);
  const res = await fetch(url, { ...nextInit, method: "POST", body: jsonBody });
  return readRaw<T>(res);
}
