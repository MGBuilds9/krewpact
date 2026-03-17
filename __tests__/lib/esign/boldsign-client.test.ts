import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger to suppress output in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { BoldSignClient, type CreateEnvelopeParams } from '@/lib/esign/boldsign-client';

describe('BoldSignClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ============================================================
  // Mock mode detection
  // ============================================================

  describe('isMockMode', () => {
    it('returns true when BOLDSIGN_API_KEY is not set', () => {
      delete process.env.BOLDSIGN_API_KEY;
      const client = new BoldSignClient();
      expect(client.isMockMode()).toBe(true);
    });

    it('returns true when BOLDSIGN_API_KEY is empty string', () => {
      process.env.BOLDSIGN_API_KEY = '';
      const client = new BoldSignClient();
      expect(client.isMockMode()).toBe(true);
    });

    it('returns true when BOLDSIGN_API_KEY is "mock"', () => {
      process.env.BOLDSIGN_API_KEY = 'mock';
      const client = new BoldSignClient();
      expect(client.isMockMode()).toBe(true);
    });

    it('returns false when BOLDSIGN_API_KEY is set to a real value', () => {
      process.env.BOLDSIGN_API_KEY = 'real-api-key-12345';
      const client = new BoldSignClient();
      expect(client.isMockMode()).toBe(false);
    });
  });

  // ============================================================
  // Mock mode operations
  // ============================================================

  describe('mock mode operations', () => {
    let client: BoldSignClient;

    beforeEach(() => {
      delete process.env.BOLDSIGN_API_KEY;
      client = new BoldSignClient();
    });

    it('createEnvelope returns a mock documentId', async () => {
      const params: CreateEnvelopeParams = {
        title: 'Test Contract',
        signers: [{ name: 'John Doe', emailAddress: 'john@example.com' }],
      };

      const result = await client.createEnvelope(params);
      expect(result.documentId).toBeDefined();
      expect(result.documentId).toMatch(/^mock-bs-/);
      expect(result.documentId.length).toBeGreaterThan(8);
    });

    it('getStatus returns mock status data', async () => {
      const status = await client.getStatus('mock-doc-123');
      expect(status.documentId).toBe('mock-doc-123');
      expect(status.status).toBe('sent');
      expect(status.signerDetails).toHaveLength(1);
      expect(status.signerDetails[0].signerName).toBe('Mock Signer');
      expect(status.senderDetail.name).toBe('KrewPact');
      expect(status.createdDate).toBeDefined();
      expect(status.activityDate).toBeDefined();
    });

    it('downloadDocument returns a buffer with mock PDF content', async () => {
      const buffer = await client.downloadDocument('mock-doc-456');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      const content = buffer.toString('utf-8');
      expect(content).toContain('%PDF');
      expect(content).toContain('mock-doc-456');
    });
  });

  // ============================================================
  // API calls (with fetch mock)
  // ============================================================

  describe('API calls', () => {
    let client: BoldSignClient;
    const mockFetch = vi.fn();

    beforeEach(() => {
      process.env.BOLDSIGN_API_KEY = 'test-api-key';
      process.env.BOLDSIGN_BASE_URL = 'https://test-api.boldsign.com/v1';
      client = new BoldSignClient();
      vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('createEnvelope sends correct request with form data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentId: 'real-doc-789' }),
      });

      const params: CreateEnvelopeParams = {
        title: 'Contract - PROP-001',
        message: 'Please sign this contract.',
        signers: [
          { name: 'Alice', emailAddress: 'alice@example.com', signerOrder: 1 },
          { name: 'Bob', emailAddress: 'bob@example.com', signerOrder: 2 },
        ],
        expiryDays: 14,
        enableSigningOrder: true,
      };

      const result = await client.createEnvelope(params);

      expect(result.documentId).toBe('real-doc-789');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://test-api.boldsign.com/v1/document/send');
      expect(options.method).toBe('POST');
      expect(options.headers['X-API-KEY']).toBe('test-api-key');
      expect(options.body).toBeInstanceOf(FormData);
    });

    it('createEnvelope throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid signer email',
      });

      const params: CreateEnvelopeParams = {
        title: 'Bad Contract',
        signers: [{ name: 'No Email', emailAddress: '' }],
      };

      await expect(client.createEnvelope(params)).rejects.toThrow(
        'BoldSign API error: 400 Bad Request',
      );
    });

    it('getStatus fetches document properties with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documentId: 'doc-abc',
          status: 'Completed',
          signerDetails: [],
          createdDate: '2026-03-01T00:00:00Z',
          activityDate: '2026-03-05T00:00:00Z',
          senderDetail: { name: 'KP', emailAddress: 'kp@test.com' },
        }),
      });

      const status = await client.getStatus('doc-abc');
      expect(status.documentId).toBe('doc-abc');
      expect(status.status).toBe('Completed');

      // Find the call that hit /document/properties (not /document/send from prior tests)
      const propertiesCall = mockFetch.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('/document/properties'),
      );
      expect(propertiesCall).toBeDefined();
      expect(propertiesCall![0]).toBe(
        'https://test-api.boldsign.com/v1/document/properties?documentId=doc-abc',
      );
    });

    it('getStatus throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Document not found',
      });

      await expect(client.getStatus('nonexistent')).rejects.toThrow(
        'BoldSign API error: 404 Not Found',
      );
    });

    it('downloadDocument fetches and returns Buffer', async () => {
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => pdfContent.buffer,
      });

      const buffer = await client.downloadDocument('doc-download-1');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer[0]).toBe(0x25); // %

      const downloadCall = mockFetch.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('/document/download'),
      );
      expect(downloadCall).toBeDefined();
      expect(downloadCall![0]).toBe(
        'https://test-api.boldsign.com/v1/document/download?documentId=doc-download-1',
      );
    });

    it('downloadDocument throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Access denied',
      });

      await expect(client.downloadDocument('forbidden-doc')).rejects.toThrow(
        'BoldSign API error: 403 Forbidden',
      );
    });
  });

  // ============================================================
  // Status mapping
  // ============================================================

  describe('mapEventStatus', () => {
    it('maps BoldSign statuses to internal statuses', () => {
      expect(BoldSignClient.mapEventStatus('Completed')).toBe('completed');
      expect(BoldSignClient.mapEventStatus('Declined')).toBe('declined');
      expect(BoldSignClient.mapEventStatus('Expired')).toBe('expired');
      expect(BoldSignClient.mapEventStatus('Revoked')).toBe('revoked');
      expect(BoldSignClient.mapEventStatus('Sent')).toBe('sent');
      expect(BoldSignClient.mapEventStatus('InProgress')).toBe('in_progress');
      expect(BoldSignClient.mapEventStatus('Draft')).toBe('draft');
      expect(BoldSignClient.mapEventStatus('WaitingForOthers')).toBe('waiting_for_others');
    });

    it('falls back to lowercase for unknown statuses', () => {
      expect(BoldSignClient.mapEventStatus('SomeNewStatus')).toBe('somenewstatus');
      expect(BoldSignClient.mapEventStatus('CUSTOM')).toBe('custom');
    });
  });

  // ============================================================
  // File upload support
  // ============================================================

  describe('file upload', () => {
    let client: BoldSignClient;
    const mockFetch = vi.fn();

    beforeEach(() => {
      process.env.BOLDSIGN_API_KEY = 'test-api-key';
      client = new BoldSignClient();
      vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('includes file URLs in form data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentId: 'doc-with-urls' }),
      });

      await client.createEnvelope({
        title: 'Contract with URL',
        signers: [{ name: 'Test', emailAddress: 'test@example.com' }],
        fileUrls: ['https://example.com/contract.pdf'],
      });

      const [, options] = mockFetch.mock.calls[0];
      const formData = options.body as FormData;
      expect(formData.get('FileUrls')).toBe('https://example.com/contract.pdf');
    });

    it('includes file content as blob in form data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentId: 'doc-with-file' }),
      });

      const pdfBuffer = Buffer.from('%PDF-1.4 test content');
      await client.createEnvelope({
        title: 'Contract with file',
        signers: [{ name: 'Test', emailAddress: 'test@example.com' }],
        files: [
          {
            fileName: 'contract.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      const [, options] = mockFetch.mock.calls[0];
      const formData = options.body as FormData;
      const file = formData.get('Files');
      expect(file).toBeDefined();
    });
  });
});
