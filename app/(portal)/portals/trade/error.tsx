'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorCard } from '@/components/ui/error-card';

export default function TradePortalError({
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
      title="Trade Portal Error"
      description="Something went wrong loading the trade partner portal."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
      homeHref="/portals/trade"
    />
  );
}
