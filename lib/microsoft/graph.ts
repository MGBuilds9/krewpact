const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class MicrosoftGraphError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'MicrosoftGraphError';
  }
}

export function buildGraphUrl(path: string, sharedMailbox?: string): string {
  const prefix = sharedMailbox ? `/users/${sharedMailbox}` : '/me';
  return `${GRAPH_BASE}${prefix}${path}`;
}

export async function getMicrosoftToken(clerkUserId: string): Promise<string> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    throw new MicrosoftGraphError('CLERK_SECRET_KEY not configured', 503);
  }

  const res = await fetch(
    `https://api.clerk.com/v1/users/${clerkUserId}/oauth_access_tokens/oauth_microsoft`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    },
  );

  if (!res.ok) {
    throw new MicrosoftGraphError(
      `Clerk OAuth token fetch failed: ${res.status} ${res.statusText}`,
      502,
    );
  }

  const tokens = await res.json();
  if (!Array.isArray(tokens) || tokens.length === 0 || !tokens[0].token) {
    throw new MicrosoftGraphError('No Microsoft OAuth token available for this user', 403);
  }

  return tokens[0].token;
}

export async function graphFetch<T = unknown>(
  token: string,
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new MicrosoftGraphError(error?.error?.message || `Graph API error: ${res.status}`, 502);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function graphErrorResponse(error: unknown): { status: number; body: { error: string } } {
  if (error instanceof MicrosoftGraphError) {
    return {
      status: error.status,
      body: { error: error.message },
    };
  }

  return {
    status: 500,
    body: { error: error instanceof Error ? error.message : 'Microsoft Graph request failed' },
  };
}
