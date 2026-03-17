import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotesPanel } from '@/components/CRM/NotesPanel';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: [
        {
          id: 'note-1',
          content: 'First note',
          is_pinned: true,
          created_at: '2026-02-26T12:00:00Z',
        },
        {
          id: 'note-2',
          content: 'Second note',
          is_pinned: false,
          created_at: '2026-02-26T10:00:00Z',
        },
      ],
      total: 2,
      hasMore: false,
    }),
  });
});

describe('NotesPanel', () => {
  it('renders "Notes" header', () => {
    render(<NotesPanel entityId="lead-1" entityType="lead" />);
    expect(screen.getByText('Notes')).toBeDefined();
  });

  it('shows notes after loading', async () => {
    render(<NotesPanel entityId="lead-1" entityType="lead" />);
    await waitFor(() => {
      expect(screen.getByText('First note')).toBeDefined();
      expect(screen.getByText('Second note')).toBeDefined();
    });
  });

  it('shows pinned notes with pin indicator', async () => {
    render(<NotesPanel entityId="lead-1" entityType="lead" />);
    await waitFor(() => {
      expect(screen.getByText('Pinned')).toBeDefined();
    });
  });

  it('shows "No notes yet." when empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, hasMore: false }),
    });
    render(<NotesPanel entityId="lead-1" entityType="lead" />);
    await waitFor(() => {
      expect(screen.getByText('No notes yet.')).toBeDefined();
    });
  });

  it('shows "Add" button in header', () => {
    render(<NotesPanel entityId="lead-1" entityType="lead" />);
    expect(screen.getByText('Add')).toBeDefined();
  });

  it('toggles collapsed state on header click', async () => {
    render(<NotesPanel entityId="lead-1" entityType="lead" />);
    await waitFor(() => screen.getByText('First note'));
    fireEvent.click(screen.getByText('Notes'));
    await waitFor(() => {
      expect(screen.queryByText('First note')).toBeNull();
    });
  });
});
