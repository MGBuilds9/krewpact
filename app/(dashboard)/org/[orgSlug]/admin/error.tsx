'use client';

import { useEffect } from 'react';
import { ErrorCard } from '@/components/ui/error-card';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
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
