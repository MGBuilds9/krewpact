import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReceiptUpload } from '@/components/TimeExpense/ReceiptUpload';

function makeFile(name = 'receipt.jpg', type = 'image/jpeg', sizeBytes = 1024) {
  return new File(['x'.repeat(sizeBytes)], name, { type });
}

describe('ReceiptUpload', () => {
  const onUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drop zone by default', () => {
    render(<ReceiptUpload onUpload={onUpload} />);
    expect(screen.getByText(/drop receipt here/i)).toBeInTheDocument();
  });

  it('shows preview after selecting a valid image file', async () => {
    render(<ReceiptUpload onUpload={onUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('invoice.jpg', 'image/jpeg');

    await userEvent.upload(input, file);

    expect(screen.getByText('invoice.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('shows error for oversized file and no preview', async () => {
    render(<ReceiptUpload onUpload={onUpload} maxSizeMb={1} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // 2 MB file, limit is 1 MB
    const file = makeFile('big.jpg', 'image/jpeg', 2 * 1024 * 1024);

    await userEvent.upload(input, file);

    expect(screen.getByText(/exceeds/i)).toBeInTheDocument();
    // No file preview — filename should not appear
    expect(screen.queryByText('big.jpg')).not.toBeInTheDocument();
  });

  it('calls onUpload with the file when upload button clicked', async () => {
    onUpload.mockResolvedValue(undefined);
    render(<ReceiptUpload onUpload={onUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('receipt.pdf', 'application/pdf');

    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
  });

  it('removes preview when X button clicked', async () => {
    render(<ReceiptUpload onUpload={onUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('receipt.jpg', 'image/jpeg');

    await userEvent.upload(input, file);
    expect(screen.getByText('receipt.jpg')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(screen.queryByText('receipt.jpg')).not.toBeInTheDocument();
    expect(screen.getByText(/drop receipt here/i)).toBeInTheDocument();
  });

  it('shows loading state while uploading', async () => {
    render(<ReceiptUpload onUpload={onUpload} isUploading />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('receipt.jpg', 'image/jpeg');

    await userEvent.upload(input, file);
    // When isUploading=true and file selected, upload button shows loading text
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
  });

  it('handles drag-over state change', () => {
    render(<ReceiptUpload onUpload={onUpload} />);
    const dropZone = screen.getByRole('button', { name: /upload receipt/i });

    fireEvent.dragOver(dropZone);
    // After dragOver, the element should be in the document (no crash)
    expect(dropZone).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    expect(dropZone).toBeInTheDocument();
  });
});
