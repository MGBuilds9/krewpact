import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PipelineChart } from '@/components/Dashboard/PipelineChart';

describe('PipelineChart', () => {
  const mockPipeline = [
    { stage: 'qualification', count: 5, value: 200000 },
    { stage: 'proposal', count: 3, value: 350000 },
    { stage: 'negotiation', count: 2, value: 500000 },
    { stage: 'closed_won', count: 4, value: 800000 },
  ];

  it('renders pipeline stages', () => {
    render(<PipelineChart data={mockPipeline} />);
    expect(screen.getByText(/qualification/i)).toBeDefined();
    expect(screen.getByText(/proposal/i)).toBeDefined();
    expect(screen.getByText(/negotiation/i)).toBeDefined();
    expect(screen.getByText(/closed.won/i)).toBeDefined();
  });

  it('renders stage values formatted as currency', () => {
    render(<PipelineChart data={mockPipeline} />);
    expect(screen.getByText('$200,000')).toBeDefined();
    expect(screen.getByText('$350,000')).toBeDefined();
  });

  it('renders stage counts', () => {
    render(<PipelineChart data={mockPipeline} />);
    expect(screen.getByText(/5 deals/)).toBeDefined();
    expect(screen.getByText(/3 deals/)).toBeDefined();
  });

  it('renders empty state when no data', () => {
    render(<PipelineChart data={[]} />);
    expect(screen.getByText(/no pipeline data/i)).toBeDefined();
  });
});
