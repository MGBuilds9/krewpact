'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorCard } from '@/components/ui/error-card';

export default function CloseoutError({
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
      title="Closeout Error"
      description="Something went wrong loading the project closeout section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
