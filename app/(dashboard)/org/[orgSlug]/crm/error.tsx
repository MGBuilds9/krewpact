'use client';

import { useEffect } from 'react';
import { ErrorCard } from '@/components/ui/error-card';

export default function CRMError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('CRM error:', error);
  }, [error]);

  return (
    <ErrorCard
      title="CRM Error"
      description="Something went wrong loading the CRM section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
