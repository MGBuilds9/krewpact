/**
 * Shared pagination helper for API routes.
 * Provides consistent pagination across all GET list endpoints.
 */

interface PaginationConfig {
  defaultLimit?: number;
  maxLimit?: number;
}

interface PaginationResult {
  limit: number;
  offset: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  config: PaginationConfig = {},
): PaginationResult {
  const { defaultLimit = 25, maxLimit = 100 } = config;

  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');

  let limit = rawLimit ? parseInt(rawLimit, 10) : defaultLimit;
  let offset = rawOffset ? parseInt(rawOffset, 10) : 0;

  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  if (isNaN(offset) || offset < 0) offset = 0;

  return { limit, offset };
}

export function paginatedResponse<T>(
  data: T[] | null,
  total: number | null,
  limit: number,
  offset: number,
) {
  return {
    data: data || [],
    total: total || 0,
    hasMore: (total || 0) > offset + limit,
  };
}
