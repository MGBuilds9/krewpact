'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorCard } from '@/components/ui/error-card';

export default function EnrichmentError({
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
      title="Enrichment Error"
      description="Something went wrong loading the lead enrichment tools."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
