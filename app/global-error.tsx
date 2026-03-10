'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: '400px' }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '1rem' }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#000',
                border: '1px solid #ccc',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
