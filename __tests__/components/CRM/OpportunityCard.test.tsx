'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { OpportunityCard } from '@/components/CRM/OpportunityCard';
import type { Opportunity } from '@/hooks/useCRM';

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    opportunity_name: 'Test Opportunity',
    lead_id: null,
    account_id: null,
    contact_id: null,
    division_id: null,
    stage: 'intake',
    target_close_date: null,
    estimated_revenue: 50000,
    probability_pct: 60,
    owner_user_id: null,
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
    ...overrides,
  };
}

describe('OpportunityCard', () => {
  it('renders opportunity name and value', () => {
    render(<OpportunityCard opportunity={makeOpp()} />);
    expect(screen.getByText('Test Opportunity')).toBeDefined();
    expect(screen.getByText('$50,000.00')).toBeDefined();
  });

  it('formats currency as CAD', () => {
    render(<OpportunityCard opportunity={makeOpp({ estimated_revenue: 1234567.89 })} />);
    expect(screen.getByText('$1,234,567.89')).toBeDefined();
  });

  it('shows probability percentage', () => {
    render(<OpportunityCard opportunity={makeOpp({ probability_pct: 75 })} />);
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('handles null estimated_revenue', () => {
    render(<OpportunityCard opportunity={makeOpp({ estimated_revenue: null })} />);
    expect(screen.getByText('Test Opportunity')).toBeDefined();
    // Should show a dash or similar for no value
    expect(screen.getByText('-')).toBeDefined();
  });

  it('shows target close date when available', () => {
    render(
      <OpportunityCard opportunity={makeOpp({ target_close_date: '2026-06-15T12:00:00Z' })} />,
    );
    expect(screen.getByText(/Jun\.? 15/i)).toBeDefined();
  });
});
