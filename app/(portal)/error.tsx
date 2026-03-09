'use client';

import { useEffect } from 'react';
import { ErrorCard } from '@/components/ui/error-card';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Portal error:', error);
  }, [error]);

  return (
    <ErrorCard
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
      homeHref="/portal"
    />
  );
}
