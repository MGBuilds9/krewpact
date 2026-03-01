import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorResponse(error: ApiError): NextResponse {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, details: error.details } },
    { status: error.status },
  );
}

export const UNAUTHORIZED = new ApiError('UNAUTHORIZED', 'Authentication required', 401);
export const INVALID_JSON = new ApiError('INVALID_JSON', 'Request body is not valid JSON', 400);

export function validationError(issues: unknown): ApiError {
  return new ApiError('VALIDATION_ERROR', 'Invalid request data', 400, { issues });
}

export function notFound(entity: string): ApiError {
  return new ApiError('NOT_FOUND', `${entity} not found`, 404);
}

export function dbError(message: string): ApiError {
  return new ApiError('DB_ERROR', message, 500);
}
