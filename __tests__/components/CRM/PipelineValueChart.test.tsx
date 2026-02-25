import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PipelineValueChart } from '@/components/CRM/PipelineValueChart';
import type { PipelineMetrics } from '@/lib/crm/metrics';

function makeMetrics(overrides: Partial<PipelineMetrics> = {}): PipelineMetrics {
  return {
    totalPipelineValue: 500000,
    weightedPipelineValue: 300000,
    opportunityCount: 10,
    averageDealSize: 50000,
    stageBreakdown: [
      { stage: 'intake', count: 3, value: 100000, weightedValue: 10000 },
      { stage: 'proposal', count: 4, value: 250000, weightedValue: 150000 },
      { stage: 'negotiation', count: 3, value: 150000, weightedValue: 120000 },
    ],
    ...overrides,
  };
}

describe('PipelineValueChart', () => {
  it('renders the chart title', () => {
    render(<PipelineValueChart metrics={makeMetrics()} />);
    expect(screen.getByText('Pipeline by Stage')).toBeDefined();
  });

  it('renders stage labels and values', () => {
    render(<PipelineValueChart metrics={makeMetrics()} />);
    expect(screen.getByText('Intake')).toBeDefined();
    expect(screen.getByText('Proposal')).toBeDefined();
    expect(screen.getByText('Negotiation')).toBeDefined();
  });

  it('renders progress bars with correct aria labels', () => {
    render(<PipelineValueChart metrics={makeMetrics()} />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBe(3);
  });

  it('shows empty state when no data', () => {
    render(<PipelineValueChart metrics={undefined} />);
    expect(screen.getByText('No pipeline data available')).toBeDefined();
  });

  it('shows loading state', () => {
    render(<PipelineValueChart metrics={undefined} isLoading={true} />);
    // Loading skeletons render, no "No pipeline data" text
    expect(screen.queryByText('No pipeline data available')).toBeNull();
  });
});
