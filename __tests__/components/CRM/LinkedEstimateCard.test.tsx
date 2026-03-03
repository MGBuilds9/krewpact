import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

import { LinkedEstimateCard } from '@/components/CRM/LinkedEstimateCard';

const mockEstimates = [
  { id: 'est-1', estimate_number: 'EST-001', total_amount: 30000, status: 'approved' },
  { id: 'est-2', estimate_number: 'EST-002', total_amount: 15000, status: 'draft' },
];

describe('LinkedEstimateCard', () => {
  it('renders estimate list with numbers and amounts', () => {
    render(
      <LinkedEstimateCard
        opportunityId="opp-1"
        estimates={mockEstimates}
        onCreateEstimate={vi.fn()}
      />,
    );
    expect(screen.getByText('EST-001')).toBeDefined();
    expect(screen.getByText('EST-002')).toBeDefined();
    expect(screen.getByText('$30,000.00')).toBeDefined();
    expect(screen.getByText('$15,000.00')).toBeDefined();
  });

  it('shows status badges', () => {
    render(
      <LinkedEstimateCard
        opportunityId="opp-1"
        estimates={mockEstimates}
        onCreateEstimate={vi.fn()}
      />,
    );
    expect(screen.getByText('approved')).toBeDefined();
    expect(screen.getByText('draft')).toBeDefined();
  });

  it('shows empty state when no estimates', () => {
    render(<LinkedEstimateCard opportunityId="opp-1" estimates={[]} onCreateEstimate={vi.fn()} />);
    expect(screen.getByText('No estimates linked to this opportunity.')).toBeDefined();
  });

  it('calls onCreateEstimate when button clicked', () => {
    const handler = vi.fn();
    render(<LinkedEstimateCard opportunityId="opp-1" estimates={[]} onCreateEstimate={handler} />);
    fireEvent.click(screen.getByText('Create Estimate'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('navigates to estimate detail on click', () => {
    render(
      <LinkedEstimateCard
        opportunityId="opp-1"
        estimates={mockEstimates}
        onCreateEstimate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('EST-001'));
    expect(mockPush).toHaveBeenCalledWith('/estimates/est-1');
  });
});
