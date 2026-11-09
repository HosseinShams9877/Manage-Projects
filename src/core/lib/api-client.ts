/** Browser-side fetcher that unwraps the { ok, data | error } envelope. */

import type { ApiResult } from "./api-response";

export class ApiClientError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
  }
}

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    headers:
      options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  let json: ApiResult<T> | null = null;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    throw new ApiClientError("پاسخ سرور نامعتبر بود.", "BAD_RESPONSE");
  }

  if (!json || !json.ok) {
    throw new ApiClientError(json?.error?.message ?? "خطای سرور.", json?.error?.code);
  }
  return json.data;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body ?? {} }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
