import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
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
  function renderNotesPanel() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <NotesPanel entityId="lead-1" entityType="lead" />
      </QueryClientProvider>,
    );
  }

  it('renders "Notes" header', () => {
    renderNotesPanel();
    expect(screen.getByText('Notes')).toBeDefined();
  });

  it('shows notes after loading', async () => {
    renderNotesPanel();
    await waitFor(() => {
      expect(screen.getByText('First note')).toBeDefined();
      expect(screen.getByText('Second note')).toBeDefined();
    });
  });

  it('shows pinned notes with pin indicator', async () => {
    renderNotesPanel();
    await waitFor(() => {
      expect(screen.getByText('Pinned')).toBeDefined();
    });
  });

  it('shows "No notes yet." when empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, hasMore: false }),
    });
    renderNotesPanel();
    await waitFor(() => {
      expect(screen.getByText('No notes yet.')).toBeDefined();
    });
  });

  it('shows "Add" button in header', () => {
    renderNotesPanel();
    expect(screen.getByText('Add')).toBeDefined();
  });

  it('toggles collapsed state on header click', async () => {
    renderNotesPanel();
    await waitFor(() => screen.getByText('First note'));
    fireEvent.click(screen.getByText('Notes'));
    await waitFor(() => {
      expect(screen.queryByText('First note')).toBeNull();
    });
  });
});
