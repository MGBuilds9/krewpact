import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '@/components/shared/EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No projects found" />);
    expect(screen.getByText('No projects found')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No results" description="Try adjusting your filters." />);
    expect(screen.getByText('Try adjusting your filters.')).toBeDefined();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('Try adjusting')).toBeNull();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="empty-icon">📂</span>} />);
    expect(screen.getByTestId('empty-icon')).toBeDefined();
  });

  it('does not render icon container when icon is omitted', () => {
    const { container } = render(<EmptyState title="Empty" />);
    // No aria-hidden icon wrapper should be present
    const ariaHidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHidden.length).toBe(0);
  });

  it('renders action when provided', () => {
    render(<EmptyState title="No projects" action={<button>Create Project</button>} />);
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeDefined();
  });

  it('does not render action slot when omitted', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="Empty" className="custom-empty" />);
    expect(container.firstElementChild?.className).toContain('custom-empty');
  });
});
