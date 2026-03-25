'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorCard } from '@/components/ui/error-card';

export default function MigrationError({
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
      title="Migration Tool Error"
      description="Something went wrong loading the migration tool."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
