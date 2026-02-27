import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagSelector } from '@/components/CRM/TagSelector';

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

describe('TagSelector', () => {
  const existingTags = [{ id: 'tag-1', name: 'Hot Lead', color: '#ef4444' }];

  it('renders existing tags as TagBadge components', () => {
    render(<TagSelector entityId="lead-1" entityType="lead" existingTags={existingTags} />);
    expect(screen.getByText('Hot Lead')).toBeDefined();
  });

  it('renders "Add tag" button', () => {
    render(<TagSelector entityId="lead-1" entityType="lead" existingTags={existingTags} />);
    expect(screen.getByText(/add tag/i)).toBeDefined();
  });

  it('fetches available tags on mount', async () => {
    render(<TagSelector entityId="lead-1" entityType="lead" existingTags={existingTags} />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/crm/tags');
    });
  });

  it('shows popover content when "Add tag" is clicked', async () => {
    render(<TagSelector entityId="lead-1" entityType="lead" existingTags={existingTags} />);
    fireEvent.click(screen.getByText(/add tag/i));
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeDefined();
    });
  });

  it('renders without crashing when existingTags is empty', () => {
    render(<TagSelector entityId="lead-1" entityType="lead" existingTags={[]} />);
    expect(screen.getByText(/add tag/i)).toBeDefined();
  });
});
