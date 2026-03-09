'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorCard } from '@/components/ui/error-card';

export default function ReportsError({
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
      title="Reports Error"
      description="Something went wrong loading the reports section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
