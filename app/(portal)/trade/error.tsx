'use client';

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
    console.error('Trade portal error:', error);
  }, [error]);

  return (
    <ErrorCard
      title="Trade Portal Error"
      description="Something went wrong loading the trade partner portal."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
      homeHref="/trade"
    />
  );
}
