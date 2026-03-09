import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/pdf/generator', () => ({
  generatePdf: vi.fn(),
}));

import { POST } from '@/app/api/pdf/generate/route';
import { auth } from '@clerk/nextjs/server';
import { generatePdf } from '@/lib/pdf/generator';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/pdf/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/pdf/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as ReturnType<
      typeof auth
    > extends Promise<infer T>
      ? T
      : never);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<
      infer T
    >
      ? T
      : never);
    const res = await POST(makeRequest({ type: 'estimate', data: {} }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid type', async () => {
    const res = await POST(makeRequest({ type: 'invalid', data: {} }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when data is missing', async () => {
    const res = await POST(makeRequest({ type: 'estimate' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns PDF buffer for valid estimate request', async () => {
    const fakePdf = Buffer.from('%PDF-1.4 fake content');
    vi.mocked(generatePdf).mockResolvedValue(fakePdf);

    const res = await POST(
      makeRequest({ type: 'estimate', data: { companyName: 'Test' } }) as never,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('.pdf');

    const body = await res.arrayBuffer();
    expect(body.byteLength).toBe(fakePdf.length);
  });

  it('returns PDF buffer for valid project-status request', async () => {
    const fakePdf = Buffer.from('%PDF-1.4 fake content');
    vi.mocked(generatePdf).mockResolvedValue(fakePdf);

    const res = await POST(
      makeRequest({ type: 'project-status', data: { companyName: 'Test' } }) as never,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  it('returns 500 when PDF generation fails', async () => {
    vi.mocked(generatePdf).mockRejectedValue(new Error('Rendering failed'));

    const res = await POST(
      makeRequest({ type: 'estimate', data: { companyName: 'Test' } }) as never,
    );
    expect(res.status).toBe(500);
  });
});
