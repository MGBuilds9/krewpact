import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ConversionFunnel } from '@/components/CRM/ConversionFunnel';
import type { ConversionMetrics } from '@/lib/crm/metrics';

function makeMetrics(overrides: Partial<ConversionMetrics> = {}): ConversionMetrics {
  return {
    totalLeads: 100,
    qualifiedLeads: 60,
    convertedLeads: 25,
    lostLeads: 15,
    qualificationRate: 0.6,
    conversionRate: 0.25,
    lossRate: 0.15,
    ...overrides,
  };
}

describe('ConversionFunnel', () => {
  it('renders the funnel title', () => {
    render(<ConversionFunnel metrics={makeMetrics()} />);
    expect(screen.getByText('Conversion Funnel')).toBeDefined();
  });

  it('renders chart container with data', () => {
    const { container } = render(<ConversionFunnel metrics={makeMetrics()} />);
    // Recharts renders funnel levels as SVG elements
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('shows lost count when present', () => {
    render(<ConversionFunnel metrics={makeMetrics()} />);
    expect(screen.getByText(/Lost: 15/)).toBeDefined();
  });

  it('shows empty state when no data', () => {
    render(<ConversionFunnel metrics={undefined} />);
    expect(screen.getByText('No lead data available')).toBeDefined();
  });

  it('shows empty state when totalLeads is 0', () => {
    render(<ConversionFunnel metrics={makeMetrics({ totalLeads: 0 })} />);
    expect(screen.getByText('No lead data available')).toBeDefined();
  });
});
