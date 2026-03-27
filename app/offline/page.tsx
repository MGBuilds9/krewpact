'use client';

import { WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">You&apos;re offline</h1>
          <p className="text-muted-foreground">
            KrewPact needs an internet connection to work. Check your connection and try again.
          </p>
        </div>
        <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
          Try Again
        </Button>
      </div>
    </div>
  );
}
