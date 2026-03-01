import { NextRequest } from 'next/server';

const BASE_URL = 'http://localhost:3000';

/**
 * Create a NextRequest for testing API routes.
 *
 * @param path - URL path, e.g. '/api/projects' or '/api/projects?limit=10'
 * @param init - Optional RequestInit (method, headers, body, etc.)
 */
export function makeRequest(path: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(path, BASE_URL), init as never);
}

/**
 * Create a NextRequest with JSON body for POST/PATCH/PUT testing.
 *
 * @param path - URL path
 * @param body - Object to JSON.stringify as request body
 * @param method - HTTP method (default: 'POST')
 */
export function makeJsonRequest(
  path: string,
  body: Record<string, unknown> | Record<string, unknown>[],
  method: string = 'POST',
): NextRequest {
  return makeRequest(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
