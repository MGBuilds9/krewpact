import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportPdfButton } from '@/components/Estimates/ExportPdfButton';

// Mock use-toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast, toasts: [], dismiss: vi.fn() }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

const defaultProps = {
  estimateNumber: 'EST-001',
  estimateData: {
    companyName: 'MDM Group Inc.',
    estimateNumber: 'EST-001',
    date: '2026-03-09',
    client: { name: 'Test Client', address: '123 Main St', email: 'test@test.com' },
    lineItems: [
      { description: 'Concrete work', quantity: 10, unit: 'sqft', unitCost: 50, markup: 15 },
    ],
    subtotal: 500,
    markupTotal: 75,
    taxRate: 13,
    taxAmount: 74.75,
    total: 649.75,
    terms: 'Net 30',
  },
};

describe('ExportPdfButton', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (createElementSpy) {
      createElementSpy.mockRestore();
      createElementSpy = null;
    }
  });

  it('renders export button with correct label', () => {
    render(<ExportPdfButton {...defaultProps} />);
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
  });

  it('shows loading spinner during PDF generation', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<ExportPdfButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /export pdf/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });
  });

  it('calls /api/pdf/generate with correct payload', async () => {
    const pdfBlob = new Blob(['fake-pdf'], { type: 'application/pdf' });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(pdfBlob),
    });

    render(<ExportPdfButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'estimate',
          data: defaultProps.estimateData,
        }),
      });
    });
  });

  it('triggers file download with correct filename', async () => {
    const pdfBlob = new Blob(['fake-pdf'], { type: 'application/pdf' });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(pdfBlob),
    });

    // Track anchor elements created for download
    const mockClick = vi.fn();
    const mockRemove = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = originalCreateElement('a');
        anchor.click = mockClick;
        anchor.remove = mockRemove;
        return anchor;
      }
      return originalCreateElement(tag);
    });

    render(<ExportPdfButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled();
    });

    // Find the anchor that was created for download
    const calls = createElementSpy.mock.results;
    const anchorResult = calls.find(
      (_r: unknown, i: number) => (createElementSpy!.mock.calls[i] as string[])[0] === 'a',
    );
    if (anchorResult && anchorResult.type === 'return') {
      const anchor = anchorResult.value as HTMLAnchorElement;
      expect(anchor.download).toMatch(/^Estimate-EST-001-\d{4}-\d{2}-\d{2}\.pdf$/);
    }
  });

  it('shows error toast on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'PDF generation failed' }),
    });

    render(<ExportPdfButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/error|failed/i),
          variant: 'destructive',
        }),
      );
    });
  });

  it('shows error toast on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<ExportPdfButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        }),
      );
    });
  });

  it('re-enables button after successful download', async () => {
    const pdfBlob = new Blob(['fake-pdf'], { type: 'application/pdf' });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(pdfBlob),
    });

    render(<ExportPdfButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /export pdf/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('re-enables button after error', async () => {
    mockFetch.mockRejectedValue(new Error('fail'));

    render(<ExportPdfButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /export pdf/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
