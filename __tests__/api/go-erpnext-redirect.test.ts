import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers/mock-auth';
import { makeRequest } from '@/__tests__/helpers/mock-request';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';

const mockAuth = vi.mocked(auth);

// Dynamic import so env mock takes effect before module evaluation
async function importRoute() {
  return import('@/app/go/erpnext/[...slug]/route');
}

function makeSlugRequest(slugPath: string, referer?: string): NextRequest {
  const req = makeRequest(`/go/erpnext/${slugPath}`);
  if (referer) {
    req.headers.set('referer', referer);
  }
  return req;
}

function makeParams(slug: string[]): { params: Promise<{ slug: string[] }> } {
  return { params: Promise.resolve({ slug }) };
}

describe('GET /go/erpnext/[...slug]', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ERPNEXT_BASE_URL = 'https://erpnext.mdmgroupinc.ca';
    // Origin check in the route uses NEXT_PUBLIC_APP_URL. CI secrets may differ
    // from the canonical origin, so pin it here to make the test hermetic.
    process.env.NEXT_PUBLIC_APP_URL = 'https://krewpact.ca';
  });

  it('redirects authenticated user to correct ERPNext URL', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await importRoute();

    const req = makeSlugRequest('sales-invoice/INV-2026-0042');
    const res = await GET(req, makeParams(['sales-invoice', 'INV-2026-0042']));

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'https://erpnext.mdmgroupinc.ca/app/sales-invoice/INV-2026-0042',
    );
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockClerkUnauth(mockAuth);
    const { GET } = await importRoute();

    const req = makeSlugRequest('projects/PROJ-001');
    const res = await GET(req, makeParams(['projects', 'PROJ-001']));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for slug with path traversal (..)', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await importRoute();

    const req = makeSlugRequest('../../etc/passwd');
    const res = await GET(req, makeParams(['..', '..', 'etc', 'passwd']));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid path');
  });

  it('returns 400 for slug with double slashes', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await importRoute();

    // Simulate a slug that would produce // when joined
    const req = makeRequest('/go/erpnext/projects//evil');
    const res = await GET(req, makeParams(['projects', '', 'evil']));

    expect(res.status).toBe(400);
  });

  it('sets kp_return_url cookie from Referer header', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await importRoute();

    const referer = 'https://krewpact.ca/org/mdm-group/projects';
    const req = makeSlugRequest('projects/PROJ-001', referer);
    const res = await GET(req, makeParams(['projects', 'PROJ-001']));

    expect(res.status).toBe(302);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('kp_return_url=');
    expect(setCookie).toContain(encodeURIComponent(referer));
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Secure');
    // Must NOT be HttpOnly so ERPNext JS can read it
    expect(setCookie).not.toContain('HttpOnly');
  });

  it('returns 503 when ERPNEXT_BASE_URL is not set', async () => {
    mockClerkAuth(mockAuth);
    delete process.env.ERPNEXT_BASE_URL;
    const { GET } = await importRoute();

    const req = makeSlugRequest('sales-invoice/INV-001');
    const res = await GET(req, makeParams(['sales-invoice', 'INV-001']));

    expect(res.status).toBe(503);
  });

  it('rejects slugs with protocol schemes (javascript:)', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await importRoute();

    const req = makeSlugRequest('javascript:alert(1)');
    const res = await GET(req, makeParams(['javascript:alert(1)']));

    expect(res.status).toBe(400);
  });

  it('rejects slugs with query strings', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await importRoute();

    const req = makeSlugRequest('sales-invoice?id=1');
    const res = await GET(req, makeParams(['sales-invoice?id=1']));

    expect(res.status).toBe(400);
  });

  it('rejects slugs with hash fragments', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await importRoute();

    const req = makeSlugRequest('page#anchor');
    const res = await GET(req, makeParams(['page#anchor']));

    expect(res.status).toBe(400);
  });

  it('falls back to / for kp_return_url when no Referer header', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await importRoute();

    const req = makeSlugRequest('purchase-order/PO-0001');
    const res = await GET(req, makeParams(['purchase-order', 'PO-0001']));

    expect(res.status).toBe(302);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('kp_return_url=%2F');
  });
});
