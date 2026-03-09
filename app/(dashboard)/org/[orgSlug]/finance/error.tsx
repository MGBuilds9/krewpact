'use client';

import { useEffect } from 'react';
import { ErrorCard } from '@/components/ui/error-card';

export default function FinanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Finance error:', error);
  }, [error]);

  return (
    <ErrorCard
      title="Finance Error"
      description="Something went wrong loading the finance section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
