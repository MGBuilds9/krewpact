'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock the CRM hooks
vi.mock('@/hooks/useCRM', () => ({
  useMarkOpportunityLost: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

import { LostDealDialog } from '@/components/CRM/LostDealDialog';
import type { Opportunity } from '@/hooks/useCRM';

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    opportunity_name: 'Test Opportunity',
    lead_id: null,
    account_id: null,
    contact_id: null,
    division_id: null,
    stage: 'proposal',
    target_close_date: null,
    estimated_revenue: 100000,
    probability_pct: 60,
    owner_user_id: null,
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
    ...overrides,
  };
}

describe('LostDealDialog', () => {
  it('renders dialog title and description', () => {
    render(
      <LostDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Mark Deal as Lost')).toBeDefined();
    expect(screen.getByText(/Test Opportunity/)).toBeDefined();
  });

  it('shows Mark as Lost button disabled when no reason selected', () => {
    render(
      <LostDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: /mark as lost/i });
    expect(button).toBeDisabled();
  });

  it('shows warning for already closed_lost opportunity', () => {
    render(
      <LostDealDialog
        opportunity={makeOpp({ stage: 'closed_lost' })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/already marked as lost/)).toBeDefined();
  });

  it('renders lost reason select', () => {
    render(
      <LostDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Lost Reason')).toBeDefined();
  });

  it('renders competitor input field', () => {
    render(
      <LostDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Competitor (optional)')).toBeDefined();
  });

  it('renders re-open as lead checkbox', () => {
    render(
      <LostDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Re-open as Lead for re-nurture')).toBeDefined();
  });

  it('renders notes textarea', () => {
    render(
      <LostDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Notes')).toBeDefined();
  });
});
