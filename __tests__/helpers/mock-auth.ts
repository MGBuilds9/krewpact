import { vi } from 'vitest';

/**
 * Sets up Clerk auth mock for API route testing.
 *
 * Must be called AFTER vi.mock('@clerk/nextjs/server') is declared at module level.
 * Returns a function that lets you configure the userId per test.
 *
 * Usage:
 *   // At module level:
 *   vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
 *   import { auth } from '@clerk/nextjs/server';
 *   const mockAuth = vi.mocked(auth);
 *
 *   // In beforeEach or test:
 *   mockClerkAuth(mockAuth, 'user_123');
 *   mockClerkAuth(mockAuth, null); // unauthenticated
 */
export function mockClerkAuth(
  mockAuth: ReturnType<typeof vi.fn>,
  userId: string | null = 'user_test_123',
) {
  mockAuth.mockResolvedValue({
    userId,
    getToken: vi.fn().mockResolvedValue(userId ? 'mock-jwt-token' : null),
    sessionId: userId ? 'session_test' : null,
    sessionClaims: userId
      ? {
          sub: userId,
          krewpact_user_id: userId,
          krewpact_org_id: 'org_test_default',
          krewpact_divisions: ['contracting'],
          krewpact_roles: ['project_manager'],
        }
      : null,
  });
}

/**
 * Convenience: set up mockAuth as unauthenticated
 */
export function mockClerkUnauth(mockAuth: ReturnType<typeof vi.fn>) {
  mockClerkAuth(mockAuth, null);
}
