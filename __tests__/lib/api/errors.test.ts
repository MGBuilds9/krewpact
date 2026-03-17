import { describe, expect, it } from 'vitest';

import {
  ApiError,
  dbError,
  errorResponse,
  INVALID_JSON,
  notFound,
  UNAUTHORIZED,
  validationError,
} from '@/lib/api/errors';

describe('ApiError', () => {
  it('constructs with required fields and defaults status to 400', () => {
    const err = new ApiError('TEST_CODE', 'Something went wrong');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('Something went wrong');
    expect(err.status).toBe(400);
    expect(err.details).toBeUndefined();
    expect(err.name).toBe('ApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('constructs with explicit status and details', () => {
    const details = { field: 'email', reason: 'required' };
    const err = new ApiError('CUSTOM_CODE', 'Custom error', 422, details);
    expect(err.status).toBe(422);
    expect(err.details).toEqual(details);
  });
});

describe('errorResponse', () => {
  it('returns a Response with the correct HTTP status', async () => {
    const err = new ApiError('TEST', 'test message', 403);
    const res = errorResponse(err);
    expect(res.status).toBe(403);
  });

  it('returns the correct JSON shape', async () => {
    const err = new ApiError('TEST', 'test message', 403, { extra: 'info' });
    const res = errorResponse(err);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: 'TEST',
        message: 'test message',
        details: { extra: 'info' },
      },
    });
  });

  it('includes undefined details as undefined in JSON body', async () => {
    const err = new ApiError('NO_DETAILS', 'no details', 400);
    const res = errorResponse(err);
    const body = await res.json();
    expect(body.error.details).toBeUndefined();
  });
});

describe('UNAUTHORIZED constant', () => {
  it('has status 401 and correct code', () => {
    expect(UNAUTHORIZED.status).toBe(401);
    expect(UNAUTHORIZED.code).toBe('UNAUTHORIZED');
    expect(UNAUTHORIZED.message).toBe('Authentication required');
  });
});

describe('INVALID_JSON constant', () => {
  it('has status 400 and correct code', () => {
    expect(INVALID_JSON.status).toBe(400);
    expect(INVALID_JSON.code).toBe('INVALID_JSON');
    expect(INVALID_JSON.message).toBe('Request body is not valid JSON');
  });
});

describe('validationError', () => {
  it('returns an ApiError with code VALIDATION_ERROR and status 400', () => {
    const issues = [{ path: ['name'], message: 'Required' }];
    const err = validationError(issues);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(400);
    expect(err.details).toEqual({ issues });
  });
});

describe('notFound', () => {
  it('returns an ApiError with code NOT_FOUND and status 404', () => {
    const err = notFound('Lead');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Lead not found');
  });

  it('interpolates the entity name into the message', () => {
    expect(notFound('Account').message).toBe('Account not found');
    expect(notFound('Contact').message).toBe('Contact not found');
  });
});

describe('dbError', () => {
  it('returns an ApiError with code DB_ERROR and status 500', () => {
    const err = dbError('connection timeout');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('DB_ERROR');
    expect(err.status).toBe(500);
    expect(err.message).toBe('connection timeout');
  });
});
