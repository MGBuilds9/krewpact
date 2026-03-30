'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorCard } from '@/components/ui/error-card';

export default function OpportunitiesError({
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
      title="Opportunities Error"
      description="Failed to load opportunities."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
