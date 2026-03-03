import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagBadge } from '@/components/CRM/TagBadge';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TagBadge', () => {
  const tag = { id: 'tag-1', name: 'Hot Lead', color: '#ef4444' };

  it('renders tag name', () => {
    render(<TagBadge tag={tag} />);
    expect(screen.getByText('Hot Lead')).toBeDefined();
  });

  it('applies tag color as background', () => {
    const { container } = render(<TagBadge tag={tag} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('renders remove button when onRemove provided', () => {
    const onRemove = vi.fn();
    render(<TagBadge tag={tag} onRemove={onRemove} />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('calls onRemove with tag id when X clicked', () => {
    const onRemove = vi.fn();
    render(<TagBadge tag={tag} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onRemove).toHaveBeenCalledWith('tag-1');
  });

  it('does not render remove button when onRemove is not provided', () => {
    render(<TagBadge tag={tag} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
