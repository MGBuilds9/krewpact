'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorCardProps {
  title?: string;
  description?: string;
  errorMessage?: string;
  errorDigest?: string;
  reset: () => void;
  homeHref?: string;
}

export function ErrorCard({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  errorMessage,
  errorDigest,
  reset,
  homeHref = '/dashboard',
}: ErrorCardProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          {errorMessage && <p className="text-sm text-muted-foreground">{errorMessage}</p>}
          {errorDigest && <p className="text-xs text-muted-foreground">Error ID: {errorDigest}</p>}
        </CardContent>
        <CardFooter className="justify-center gap-3">
          <Button onClick={reset} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="ghost">
            <Link href={homeHref}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
