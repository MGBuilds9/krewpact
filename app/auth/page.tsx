'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            BuildAxis
          </h1>
          <p className="text-muted-foreground">
            Construction Management Platform
          </p>
        </div>

        {error === 'domain_restricted' && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Access is restricted to authorized domains. Please sign in with your
            company email.
          </div>
        )}

        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-card border border-border',
              },
            }}
            routing="hash"
            fallbackRedirectUrl="/"
          />
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}
