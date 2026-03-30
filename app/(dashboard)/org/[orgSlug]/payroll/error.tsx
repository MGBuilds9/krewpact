'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorCard } from '@/components/ui/error-card';

export default function PayrollError({
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
      title="Payroll Error"
      description="Something went wrong loading payroll data. Your export data is safe."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
