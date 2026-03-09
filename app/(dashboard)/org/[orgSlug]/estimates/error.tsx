'use client';

import { useEffect } from 'react';
import { ErrorCard } from '@/components/ui/error-card';

export default function EstimatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Estimates error:', error);
  }, [error]);

  return (
    <ErrorCard
      title="Estimates Error"
      description="Something went wrong loading the estimates section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
