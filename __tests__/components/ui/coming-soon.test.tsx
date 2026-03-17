import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock lucide-react Construction icon
vi.mock('lucide-react', () => ({
  Construction: ({ className }: { className?: string }) => (
    <svg data-testid="construction-icon" className={className} />
  ),
}));

// Mock shadcn Card primitives
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

import { ComingSoon } from '@/components/ui/coming-soon';

describe('ComingSoon', () => {
  it('renders the feature name', () => {
    render(<ComingSoon feature="Client Portals" />);
    expect(screen.getByText('Client Portals')).toBeDefined();
  });

  it('renders a different feature name correctly', () => {
    render(<ComingSoon feature="Finance Dashboard" />);
    expect(screen.getByText('Finance Dashboard')).toBeDefined();
  });

  it('renders the default description when none is provided', () => {
    render(<ComingSoon feature="Schedule" />);
    expect(
      screen.getByText('This feature is being prepared and will be available soon.'),
    ).toBeDefined();
  });

  it('renders a custom description when provided', () => {
    render(<ComingSoon feature="Bidding" description="Available in Q3 2026." />);
    expect(screen.getByText('Available in Q3 2026.')).toBeDefined();
  });

  it('does not render the default description when a custom one is provided', () => {
    render(<ComingSoon feature="Warranty" description="Coming after construction phase." />);
    expect(
      screen.queryByText('This feature is being prepared and will be available soon.'),
    ).toBeNull();
  });

  it('renders the Construction icon', () => {
    render(<ComingSoon feature="Safety" />);
    expect(screen.getByTestId('construction-icon')).toBeDefined();
  });

  it('renders Card and CardContent wrappers', () => {
    render(<ComingSoon feature="Migration Tool" />);
    expect(screen.getByTestId('card')).toBeDefined();
    expect(screen.getByTestId('card-content')).toBeDefined();
  });

  it('renders feature name in a heading element', () => {
    render(<ComingSoon feature="Executive Reports" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Executive Reports');
  });
});
