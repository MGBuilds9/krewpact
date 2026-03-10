import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

describe('Demo mode production guard', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it('exports DEMO_MODE as false by default', async () => {
    const { DEMO_MODE } = await import('@/lib/demo-mode');
    expect(DEMO_MODE).toBe(false);
  });

  it('exports DEMO_MODE as true when env is set', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const { DEMO_MODE } = await import('@/lib/demo-mode');
    expect(DEMO_MODE).toBe(true);
  });

  it('demo client getToken returns null (never leaks real tokens)', async () => {
    const { useAuth } = await import('@/lib/clerk-demo-client');
    const auth = useAuth();
    const token = await auth.getToken();
    expect(token).toBeNull();
  });

  it('demo server getToken returns null (never leaks real tokens)', async () => {
    const { auth } = await import('@/lib/clerk-demo-server');
    const session = await auth();
    const token = await session.getToken();
    expect(token).toBeNull();
  });

  it('demo user has static IDs (not real user data)', async () => {
    const { DEMO_USER } = await import('@/lib/demo-mode');
    expect(DEMO_USER.id).toBe('demo_clerk_user');
    expect(DEMO_USER.clerkUserId).toMatch(/^user_/);
  });
});
