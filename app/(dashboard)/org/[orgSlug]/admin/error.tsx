'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorCard } from '@/components/ui/error-card';

export default function AdminError({
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
      title="Admin Error"
      description="Something went wrong loading the admin section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
