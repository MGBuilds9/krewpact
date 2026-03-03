import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagFilterBar } from '@/components/CRM/TagFilterBar';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: [
        { id: 'tag-1', name: 'Hot Lead', color: '#ef4444' },
        { id: 'tag-2', name: 'VIP', color: '#3b82f6' },
      ],
    }),
  });
});

describe('TagFilterBar', () => {
  it('renders nothing when no tags loaded (before fetch completes)', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<TagFilterBar selectedTagIds={[]} onTagFilterChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders tag pills after fetch', async () => {
    render(<TagFilterBar selectedTagIds={[]} onTagFilterChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Hot Lead')).toBeDefined();
      expect(screen.getByText('VIP')).toBeDefined();
    });
  });

  it('calls onTagFilterChange when tag clicked', async () => {
    const onTagFilterChange = vi.fn();
    render(<TagFilterBar selectedTagIds={[]} onTagFilterChange={onTagFilterChange} />);
    await waitFor(() => screen.getByText('Hot Lead'));
    fireEvent.click(screen.getByText('Hot Lead'));
    expect(onTagFilterChange).toHaveBeenCalledWith(['tag-1']);
  });

  it('shows "Clear filters" button when tags are selected, and clears on click', async () => {
    const onTagFilterChange = vi.fn();
    render(<TagFilterBar selectedTagIds={['tag-1']} onTagFilterChange={onTagFilterChange} />);
    await waitFor(() => screen.getByText('Hot Lead'));
    const clearBtn = screen.getByText(/clear filters/i);
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn);
    expect(onTagFilterChange).toHaveBeenCalledWith([]);
  });
});
