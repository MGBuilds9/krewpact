import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildGraphUrl,
  getMicrosoftToken,
  graphFetch,
} from '@/lib/microsoft/graph';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_abc123');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('buildGraphUrl', () => {
  it('builds /me path when no shared mailbox is provided', () => {
    const url = buildGraphUrl('/messages');
    expect(url).toBe('https://graph.microsoft.com/v1.0/me/messages');
  });

  it('builds /users/{mailbox} path for shared mailbox', () => {
    const url = buildGraphUrl('/messages', 'shared@mdmgroupinc.ca');
    expect(url).toBe(
      'https://graph.microsoft.com/v1.0/users/shared@mdmgroupinc.ca/messages'
    );
  });

  it('builds calendar events path without shared mailbox', () => {
    const url = buildGraphUrl('/events');
    expect(url).toBe('https://graph.microsoft.com/v1.0/me/events');
  });

  it('builds calendar events path with shared mailbox', () => {
    const url = buildGraphUrl('/events', 'calendar@mdmgroupinc.ca');
    expect(url).toBe(
      'https://graph.microsoft.com/v1.0/users/calendar@mdmgroupinc.ca/events'
    );
  });

  it('handles paths with query parameters', () => {
    const url = buildGraphUrl('/messages?$top=10&$select=subject');
    expect(url).toBe(
      'https://graph.microsoft.com/v1.0/me/messages?$top=10&$select=subject'
    );
  });
});

describe('getMicrosoftToken', () => {
  it('returns token on successful Clerk API call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ token: 'ms-access-token-123' }],
    });

    const token = await getMicrosoftToken('user_abc');
    expect(token).toBe('ms-access-token-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.clerk.com/v1/users/user_abc/oauth_access_tokens/oauth_microsoft',
      {
        headers: {
          Authorization: 'Bearer sk_test_abc123',
        },
      }
    );
  });

  it('throws when CLERK_SECRET_KEY is not set', async () => {
    const original = process.env.CLERK_SECRET_KEY;
    process.env.CLERK_SECRET_KEY = '';

    try {
      await expect(getMicrosoftToken('user_abc')).rejects.toThrow(
        'CLERK_SECRET_KEY not configured'
      );
    } finally {
      process.env.CLERK_SECRET_KEY = original;
    }
  });

  it('throws when Clerk API returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(getMicrosoftToken('user_abc')).rejects.toThrow(
      'Clerk OAuth token fetch failed: 401 Unauthorized'
    );
  });

  it('throws when Clerk returns empty token array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await expect(getMicrosoftToken('user_abc')).rejects.toThrow(
      'No Microsoft OAuth token available for this user'
    );
  });

  it('throws when Clerk returns token object without token field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ provider: 'oauth_microsoft' }],
    });

    await expect(getMicrosoftToken('user_abc')).rejects.toThrow(
      'No Microsoft OAuth token available for this user'
    );
  });

  it('throws when Clerk returns non-array response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'unexpected' }),
    });

    await expect(getMicrosoftToken('user_abc')).rejects.toThrow(
      'No Microsoft OAuth token available for this user'
    );
  });
});

describe('graphFetch', () => {
  const testUrl = 'https://graph.microsoft.com/v1.0/me/messages';
  const testToken = 'ms-access-token-123';

  it('returns parsed JSON on successful GET request', async () => {
    const mockData = { value: [{ id: '1', subject: 'Test' }] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await graphFetch(testToken, testUrl);
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(testUrl, {
      headers: {
        Authorization: `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    });
  });

  it('passes custom options and headers to fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await graphFetch(testToken, testUrl, {
      method: 'POST',
      body: JSON.stringify({ subject: 'Hello' }),
      headers: { Prefer: 'outlook.body-content-type="text"' },
    });

    expect(mockFetch).toHaveBeenCalledWith(testUrl, {
      method: 'POST',
      body: JSON.stringify({ subject: 'Hello' }),
      headers: {
        Authorization: `Bearer ${testToken}`,
        'Content-Type': 'application/json',
        Prefer: 'outlook.body-content-type="text"',
      },
    });
  });

  it('throws with Graph API error message on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({
        error: { code: 'ErrorAccessDenied', message: 'Access is denied.' },
      }),
    });

    await expect(graphFetch(testToken, testUrl)).rejects.toThrow(
      'Access is denied.'
    );
  });

  it('falls back to status code message when error JSON parse fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('parse error');
      },
    });

    await expect(graphFetch(testToken, testUrl)).rejects.toThrow(
      'Internal Server Error'
    );
  });

  it('falls back to generic message when error has no message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => ({}),
    });

    await expect(graphFetch(testToken, testUrl)).rejects.toThrow(
      'Graph API error: 502'
    );
  });
});
