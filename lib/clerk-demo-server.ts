/**
 * Mock @clerk/nextjs/server for demo mode.
 * Provides the same API surface as Clerk's server SDK
 * but returns static demo user data instead of requiring auth.
 */

import { DEMO_USER } from './demo-mode';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock auth() — returns a fake userId and session claims
export async function auth() {
  return {
    userId: DEMO_USER.clerkUserId,
    sessionId: 'demo_session',
    sessionClaims: {
      email: DEMO_USER.emailAddress,
      sub: DEMO_USER.clerkUserId,
    },
    getToken: async () => null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    protect: () => undefined,
  };
}

// Mock currentUser() — returns a fake Clerk user object
export async function currentUser() {
  return {
    id: DEMO_USER.clerkUserId,
    firstName: DEMO_USER.firstName,
    lastName: DEMO_USER.lastName,
    fullName: DEMO_USER.fullName,
    primaryEmailAddress: {
      emailAddress: DEMO_USER.emailAddress,
    },
    imageUrl: DEMO_USER.imageUrl,
    emailAddresses: [
      { emailAddress: DEMO_USER.emailAddress },
    ],
  };
}

// Mock clerkMiddleware — pass-through, no auth checks
export function clerkMiddleware(
  handler?: (auth: ReturnType<typeof createDemoAuth>, req: NextRequest) => Response | void | Promise<Response | void>,
  _options?: Record<string, unknown>,
) {
  return async (req: NextRequest) => {
    if (handler) {
      const demoAuth = createDemoAuth();
      const result = await handler(demoAuth, req);
      if (result) return result;
    }
    return NextResponse.next();
  };
}

function createDemoAuth() {
  const authFn = async () => ({
    userId: DEMO_USER.clerkUserId,
    sessionClaims: {
      email: DEMO_USER.emailAddress,
    },
  });
  authFn.protect = () => undefined;
  return authFn;
}

// Mock createRouteMatcher — always returns false (no public route checks needed)
export function createRouteMatcher(_patterns: string[]) {
  return (_req: NextRequest) => false;
}
