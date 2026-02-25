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
  useMarkOpportunityWon: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

import { WonDealDialog } from '@/components/CRM/WonDealDialog';
import type { Opportunity } from '@/hooks/useCRM';

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    opportunity_name: 'Test Opportunity',
    lead_id: null,
    account_id: null,
    contact_id: null,
    division_id: null,
    stage: 'contracted',
    target_close_date: null,
    estimated_revenue: 100000,
    probability_pct: 90,
    owner_user_id: null,
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
    ...overrides,
  };
}

describe('WonDealDialog', () => {
  it('renders dialog title and description', () => {
    render(
      <WonDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Mark Deal as Won')).toBeDefined();
    expect(screen.getByText(/Test Opportunity/)).toBeDefined();
  });

  it('shows Mark as Won button enabled for contracted opportunity', () => {
    render(
      <WonDealDialog
        opportunity={makeOpp({ stage: 'contracted' })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: /mark as won/i });
    expect(button).not.toBeDisabled();
  });

  it('shows warning and disables button for non-contracted opportunity', () => {
    render(
      <WonDealDialog
        opportunity={makeOpp({ stage: 'proposal' })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/contracted/)).toBeDefined();
    const button = screen.getByRole('button', { name: /mark as won/i });
    expect(button).toBeDisabled();
  });

  it('renders won date input with default value', () => {
    render(
      <WonDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    const dateInput = screen.getByLabelText('Won Date') as HTMLInputElement;
    expect(dateInput).toBeDefined();
    // Default is today
    const today = new Date().toISOString().split('T')[0];
    expect(dateInput.value).toBe(today);
  });

  it('renders notes textarea', () => {
    render(
      <WonDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Notes')).toBeDefined();
  });

  it('renders Sync to ERPNext checkbox', () => {
    render(
      <WonDealDialog
        opportunity={makeOpp()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Sync to ERPNext')).toBeDefined();
  });
});
