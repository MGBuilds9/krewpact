import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { StatsCard } from '@/components/shared/StatsCard';

describe('StatsCard', () => {
  it('renders the title', () => {
    render(<StatsCard title="Total Projects" value={42} />);
    expect(screen.getByText('Total Projects')).toBeDefined();
  });

  it('renders a numeric value', () => {
    render(<StatsCard title="Revenue" value={1250} />);
    expect(screen.getByText('1250')).toBeDefined();
  });

  it('renders a string value', () => {
    render(<StatsCard title="Status" value="$12,500" />);
    expect(screen.getByText('$12,500')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(<StatsCard title="Leads" value={10} description="vs last month" />);
    expect(screen.getByText('vs last month')).toBeDefined();
  });

  it('does not render description when omitted', () => {
    const { container } = render(<StatsCard title="Leads" value={10} />);
    const ps = container.querySelectorAll('p');
    expect(ps.length).toBe(0);
  });

  it('renders an icon when provided', () => {
    render(<StatsCard title="Projects" value={5} icon={<span data-testid="icon">📋</span>} />);
    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('renders positive trend with up arrow', () => {
    render(<StatsCard title="Revenue" value={100} trend={{ value: 12, label: 'vs last month' }} />);
    expect(screen.getByText(/↑/)).toBeDefined();
    expect(screen.getByText(/vs last month/)).toBeDefined();
  });

  it('renders negative trend with down arrow', () => {
    render(<StatsCard title="Revenue" value={100} trend={{ value: -5, label: 'vs last month' }} />);
    expect(screen.getByText(/↓/)).toBeDefined();
  });

  it('does not render trend section when trend is omitted', () => {
    render(<StatsCard title="Revenue" value={100} />);
    expect(screen.queryByText('↑')).toBeNull();
    expect(screen.queryByText('↓')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatsCard title="Test" value={0} className="custom-stats-card" />,
    );
    expect(container.firstElementChild?.className).toContain('custom-stats-card');
  });
});
