'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock the CRM hooks
vi.mock('@/hooks/useCRM', () => ({
  useAccounts: () => ({
    data: [
      { id: 'acct-1', account_name: 'Test Account' },
    ],
  }),
  useContacts: () => ({
    data: [
      { id: 'contact-1', first_name: 'Jane', last_name: 'Smith' },
    ],
  }),
  useConvertLead: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

import { ConvertLeadDialog } from '@/components/CRM/ConvertLeadDialog';
import type { Lead } from '@/hooks/useCRM';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    company_name: 'Test Lead Corp',
    domain: null,
    industry: null,
    company_size: null,
    revenue_range: null,
    address: null,
    city: null,
    province: null,
    postal_code: null,
    country: null,
    division_id: null,
    source_channel: null,
    source_campaign: null,
    status: 'won',
    substatus: null,
    lead_score: null,
    fit_score: null,
    intent_score: null,
    engagement_score: null,
    is_qualified: false,
    in_sequence: false,
    notes: null,
    tags: null,
    owner_id: null,
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
    last_activity_at: null,
    last_contacted_at: null,
    next_followup_at: null,
    deleted_at: null,
    ...overrides,
  };
}

describe('ConvertLeadDialog', () => {
  it('renders dialog title and description', () => {
    render(
      <ConvertLeadDialog
        lead={makeLead()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Convert Lead to Opportunity')).toBeDefined();
    expect(screen.getByText(/Test Lead Corp/)).toBeDefined();
  });

  it('shows convert button enabled for won leads', () => {
    render(
      <ConvertLeadDialog
        lead={makeLead({ status: 'won' })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: /convert to opportunity/i });
    expect(button).not.toBeDisabled();
  });

  it('shows warning and disables button for non-won leads', () => {
    render(
      <ConvertLeadDialog
        lead={makeLead({ status: 'new' })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/must be in/i)).toBeDefined();
    const button = screen.getByRole('button', { name: /convert to opportunity/i });
    expect(button).toBeDisabled();
  });

  it('pre-fills opportunity name from company name', () => {
    render(
      <ConvertLeadDialog
        lead={makeLead({ company_name: 'My Company' })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Opportunity Name') as HTMLInputElement;
    expect(input.value).toBe('My Company');
  });
});
