import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConversionFunnel } from '@/components/CRM/ConversionFunnel';
import { ConversionFunnelChart } from '@/components/CRM/ConversionFunnelChart';
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

  it('shows empty state when no data', () => {
    render(<ConversionFunnel metrics={undefined} />);
    expect(screen.getByText('No lead data available')).toBeDefined();
  });

  it('shows empty state when totalLeads is 0', () => {
    render(<ConversionFunnel metrics={makeMetrics({ totalLeads: 0 })} />);
    expect(screen.getByText('No lead data available')).toBeDefined();
  });
});

describe('ConversionFunnelChart', () => {
  it('renders chart container with data', () => {
    const { container } = render(<ConversionFunnelChart metrics={makeMetrics()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('shows lost count when present', () => {
    render(<ConversionFunnelChart metrics={makeMetrics()} />);
    expect(screen.getByText(/Lost: 15/)).toBeDefined();
  });
});
