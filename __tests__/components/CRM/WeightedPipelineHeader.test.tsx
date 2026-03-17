'use client';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { WeightedPipelineHeader } from '@/components/CRM/WeightedPipelineHeader';

describe('WeightedPipelineHeader', () => {
  it('renders total pipeline value', () => {
    render(
      <WeightedPipelineHeader totalValue={500000} weightedValue={250000} opportunityCount={10} />,
    );
    expect(screen.getByText('$500,000.00')).toBeDefined();
    expect(screen.getByText('Total Pipeline')).toBeDefined();
  });

  it('renders weighted pipeline value', () => {
    render(
      <WeightedPipelineHeader totalValue={500000} weightedValue={250000} opportunityCount={10} />,
    );
    expect(screen.getByText('$250,000.00')).toBeDefined();
    expect(screen.getByText('Weighted Pipeline')).toBeDefined();
  });

  it('renders opportunity count', () => {
    render(
      <WeightedPipelineHeader totalValue={500000} weightedValue={250000} opportunityCount={10} />,
    );
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('Opportunities')).toBeDefined();
  });

  it('handles zero values', () => {
    render(<WeightedPipelineHeader totalValue={0} weightedValue={0} opportunityCount={0} />);
    const zeroDollars = screen.getAllByText('$0.00');
    expect(zeroDollars).toHaveLength(2);
    expect(screen.getByText('0')).toBeDefined();
  });
});
