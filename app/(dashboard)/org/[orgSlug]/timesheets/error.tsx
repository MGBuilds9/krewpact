'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorCard } from '@/components/ui/error-card';

export default function TimesheetsError({
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
      title="Timesheets Error"
      description="Something went wrong loading the timesheets section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
