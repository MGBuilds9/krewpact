const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export function buildGraphUrl(path: string, sharedMailbox?: string): string {
  const prefix = sharedMailbox ? `/users/${sharedMailbox}` : '/me';
  return `${GRAPH_BASE}${prefix}${path}`;
}

export async function getMicrosoftToken(clerkUserId: string): Promise<string> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    throw new Error('CLERK_SECRET_KEY not configured');
  }

  const res = await fetch(
    `https://api.clerk.com/v1/users/${clerkUserId}/oauth_access_tokens/oauth_microsoft`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Clerk OAuth token fetch failed: ${res.status} ${res.statusText}`
    );
  }

  const tokens = await res.json();
  if (!Array.isArray(tokens) || tokens.length === 0 || !tokens[0].token) {
    throw new Error('No Microsoft OAuth token available for this user');
  }

  return tokens[0].token;
}

export async function graphFetch<T = unknown>(
  token: string,
  url: string,
  options: RequestInit = {}
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
    const error = await res
      .json()
      .catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error?.error?.message || `Graph API error: ${res.status}`);
  }

  return res.json();
}
