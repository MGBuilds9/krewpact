/**
 * Shared fetch wrapper for BFF API routes.
 * Handles auth headers, error parsing, and JSON responses.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Fetch wrapper that calls BFF API routes with proper error handling.
 * Automatically includes credentials for Clerk auth cookies.
 */
export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options;

  // Build URL with query params
  let url = path;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const response = await fetch(url, {
    credentials: 'include',
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let errorData: unknown;
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = text;
    }
    const message =
      typeof errorData === 'object' && errorData !== null && 'error' in errorData
        ? String((errorData as Record<string, unknown>).error)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  return response.json() as Promise<T>;
}

/**
 * Shape returned by all API list routes that use paginatedResponse().
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

/**
 * Fetch a paginated list endpoint and unwrap the data array.
 * Use for any API route that returns paginatedResponse().
 * For single-object responses (detail, create, update), use apiFetch<T>().
 */
export async function apiFetchList<T>(path: string, options?: FetchOptions): Promise<T[]> {
  const result = await apiFetch<PaginatedResponse<T>>(path, options);
  return result.data;
}
