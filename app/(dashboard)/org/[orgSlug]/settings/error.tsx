'use client';

import { useEffect } from 'react';
import { ErrorCard } from '@/components/ui/error-card';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Settings error:', error);
  }, [error]);

  return (
    <ErrorCard
      title="Settings Error"
      description="Something went wrong loading the settings section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
