/**
 * Mock @clerk/nextjs for demo mode.
 * Provides the same client-side API surface as Clerk's React SDK
 * but returns static demo user data.
 */

'use client';

import React from 'react';
import { DEMO_USER } from './demo-mode';

// Mock ClerkProvider — just renders children
export function ClerkProvider({ children }: { children: React.ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

// Mock useUser hook
export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: DEMO_USER.clerkUserId,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      fullName: DEMO_USER.fullName,
      primaryEmailAddress: {
        emailAddress: DEMO_USER.emailAddress,
      },
      imageUrl: DEMO_USER.imageUrl,
      emailAddresses: [{ emailAddress: DEMO_USER.emailAddress }],
    },
  };
}

// Mock useClerk hook
export function useClerk() {
  return {
    signOut: async () => {
      // In demo mode, just reload
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    },
    session: {
      id: 'demo_session',
    },
    user: useUser().user,
    loaded: true,
  };
}

// Mock useAuth hook
export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: DEMO_USER.clerkUserId,
    sessionId: 'demo_session',
    getToken: async () => null,
    orgId: null,
    orgRole: null,
    signOut: async () => {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    },
  };
}

// Mock SignIn component
export function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-lg border bg-card">
      <h2 className="text-2xl font-bold mb-2">KrewPact Demo Mode</h2>
      <p className="text-muted-foreground mb-4">Signed in as {DEMO_USER.fullName}</p>
      <a
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
      </a>
    </div>
  );
}

// Mock SignUp component
export function SignUp() {
  return <SignIn />;
}

// Mock SignedIn — always renders children in demo mode
export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Mock SignedOut — never renders children in demo mode
export function SignedOut({ children: _children }: { children: React.ReactNode }) {
  return null;
}

// Mock UserButton
export function UserButton() {
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
      MG
    </div>
  );
}
