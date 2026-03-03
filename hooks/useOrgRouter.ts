'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Returns org-aware navigation helpers.
 * Prefixes paths with /org/{orgSlug} automatically.
 */
export function useOrgRouter() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) || 'default';

  const orgPath = useCallback(
    (path: string) => `/org/${orgSlug}${path.startsWith('/') ? path : `/${path}`}`,
    [orgSlug],
  );

  const push = useCallback((path: string) => router.push(orgPath(path)), [router, orgPath]);

  const replace = useCallback((path: string) => router.replace(orgPath(path)), [router, orgPath]);

  return { orgSlug, orgPath, push, replace, router };
}
