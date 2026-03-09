'use client';

import { useEffect } from 'react';
import { ErrorCard } from '@/components/ui/error-card';

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Projects error:', error);
  }, [error]);

  return (
    <ErrorCard
      title="Projects Error"
      description="Something went wrong loading the projects section."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
