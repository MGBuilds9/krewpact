import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SalesVelocityCard } from '@/components/CRM/SalesVelocityCard';
import type { VelocityMetrics } from '@/lib/crm/metrics';

function makeMetrics(overrides: Partial<VelocityMetrics> = {}): VelocityMetrics {
  return {
    averageDaysToClose: 30,
    averageDaysInStage: { intake: 5, proposal: 10, negotiation: 15 },
    dealsClosed: 8,
    dealsClosedValue: 400000,
    ...overrides,
  };
}

describe('SalesVelocityCard', () => {
  it('renders the card title', () => {
    render(<SalesVelocityCard metrics={makeMetrics()} />);
    expect(screen.getByText('Sales Velocity')).toBeDefined();
  });

  it('renders key metrics', () => {
    render(<SalesVelocityCard metrics={makeMetrics()} />);
    expect(screen.getByText('30')).toBeDefined(); // avg days
    expect(screen.getByText('8')).toBeDefined(); // deals closed
    expect(screen.getByText('Avg Days to Close')).toBeDefined();
    expect(screen.getByText('Deals Won')).toBeDefined();
  });

  it('renders stage chart when stage data exists', () => {
    const { container } = render(<SalesVelocityCard metrics={makeMetrics()} />);
    // Recharts renders stage bars as SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(screen.getByText('Average Days per Stage')).toBeDefined();
  });

  it('shows empty state when no data', () => {
    render(<SalesVelocityCard metrics={undefined} />);
    expect(screen.getByText('No velocity data available')).toBeDefined();
  });
});
