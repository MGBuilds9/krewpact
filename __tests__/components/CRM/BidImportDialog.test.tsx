import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useCRM', () => ({
  useImportBidding: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ imported: 1, items: [] }),
    isPending: false,
  }),
}));

import { BidImportDialog } from '@/components/CRM/BidImportDialog';

describe('BidImportDialog', () => {
  it('renders dialog title when open', () => {
    render(<BidImportDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Import Bids')).toBeDefined();
  });

  it('does not render dialog content when closed', () => {
    render(<BidImportDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText('Import Bids')).toBeNull();
  });

  it('shows parse error for invalid input', async () => {
    render(<BidImportDialog open={true} onOpenChange={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'not valid csv or json' } });
    const parseBtn = screen.getByRole('button', { name: /parse/i });
    fireEvent.click(parseBtn);
    expect(screen.getByText(/No valid bids found/i)).toBeDefined();
  });

  it('shows preview table after valid CSV input', () => {
    render(<BidImportDialog open={true} onOpenChange={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'title,source\nMERX Bid A,merx\nMERX Bid B,merx' },
    });
    const parseBtn = screen.getByRole('button', { name: /parse/i });
    fireEvent.click(parseBtn);
    expect(screen.getByText('2 bid(s) ready to import')).toBeDefined();
    expect(screen.getByText('MERX Bid A')).toBeDefined();
    expect(screen.getByText('MERX Bid B')).toBeDefined();
  });

  it('shows preview table after valid JSON input', () => {
    render(<BidImportDialog open={true} onOpenChange={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify([{ title: 'JSON Bid', source: 'bids_tenders', estimated_value: 75000 }]),
      },
    });
    const parseBtn = screen.getByRole('button', { name: /parse/i });
    fireEvent.click(parseBtn);
    expect(screen.getByText('1 bid(s) ready to import')).toBeDefined();
    expect(screen.getByText('JSON Bid')).toBeDefined();
  });

  it('import button is disabled before parsing', () => {
    render(<BidImportDialog open={true} onOpenChange={vi.fn()} />);
    const importBtn = screen.getByRole('button', { name: /import 0/i });
    expect(importBtn).toBeDisabled();
  });

  it('calls onOpenChange(false) when dialog closes', () => {
    const onOpenChange = vi.fn();
    render(<BidImportDialog open={true} onOpenChange={onOpenChange} />);
    // Radix Dialog close button
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
