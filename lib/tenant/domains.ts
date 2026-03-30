import { logger } from '@/lib/logger';

const VERCEL_API = 'https://api.vercel.com';

function buildUrl(path: string): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(`${VERCEL_API}${path}`);
  if (teamId) url.searchParams.set('teamId', teamId);
  return url.toString();
}

function isConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
}

export async function addCustomDomain(
  domain: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    return { success: false, error: 'Domain management not configured' };
  }

  const projectId = process.env.VERCEL_PROJECT_ID as string;

  try {
    const res = await fetch(
      buildUrl(`/v10/projects/${encodeURIComponent(projectId)}/domains`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
      },
    );

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const message = body?.error?.message ?? `Vercel API error ${res.status}`;
      logger.error('addCustomDomain failed', { domain, status: res.status, message });
      return { success: false, error: message };
    }

    return { success: true };
  } catch (err) {
    logger.error('addCustomDomain threw', { domain, error: err instanceof Error ? err.message : String(err) });
    return { success: false, error: 'Failed to add domain' };
  }
}

export async function removeCustomDomain(
  domain: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    return { success: false, error: 'Domain management not configured' };
  }

  const projectId = process.env.VERCEL_PROJECT_ID as string;

  try {
    const res = await fetch(
      buildUrl(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`),
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        },
      },
    );

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const message = body?.error?.message ?? `Vercel API error ${res.status}`;
      logger.error('removeCustomDomain failed', { domain, status: res.status, message });
      return { success: false, error: message };
    }

    return { success: true };
  } catch (err) {
    logger.error('removeCustomDomain threw', { domain, error: err instanceof Error ? err.message : String(err) });
    return { success: false, error: 'Failed to remove domain' };
  }
}
