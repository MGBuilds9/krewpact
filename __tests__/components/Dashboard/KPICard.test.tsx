import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KPICard } from '@/components/Dashboard/KPICard';

describe('KPICard', () => {
  it('renders label and formatted value', () => {
    render(<KPICard label="Total Pipeline" value="$450,000" />);
    expect(screen.getByText('Total Pipeline')).toBeDefined();
    expect(screen.getByText('$450,000')).toBeDefined();
  });

  it('renders trend indicator up with positive change', () => {
    render(<KPICard label="Win Rate" value="25%" trend="up" changePercent={12} />);
    expect(screen.getByText('Win Rate')).toBeDefined();
    expect(screen.getByText('25%')).toBeDefined();
    expect(screen.getByText('+12%')).toBeDefined();
  });

  it('renders trend indicator down with negative change', () => {
    render(<KPICard label="Deal Size" value="$5,000" trend="down" changePercent={-8} />);
    expect(screen.getByText('-8%')).toBeDefined();
  });

  it('renders flat trend', () => {
    render(<KPICard label="Projects" value="10" trend="flat" changePercent={0} />);
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('renders without trend when not provided', () => {
    const { container } = render(<KPICard label="Count" value="42" />);
    expect(container.querySelector('[data-testid="trend-indicator"]')).toBeNull();
  });
});
