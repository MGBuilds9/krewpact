'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorCard } from '@/components/ui/error-card';

export default function ClientPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorCard
      title="Client Portal Error"
      description="Something went wrong loading the client portal."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
      homeHref="/portals/client/projects"
    />
  );
}
