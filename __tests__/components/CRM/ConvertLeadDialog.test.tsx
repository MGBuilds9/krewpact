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
    lead_name: 'Test Lead',
    division_id: null,
    source: null,
    company_name: null,
    email: null,
    phone: null,
    estimated_value: 50000,
    probability_pct: 60,
    stage: 'won',
    assigned_to: null,
    lost_reason: null,
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
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
    expect(screen.getByText(/Test Lead/)).toBeDefined();
  });

  it('shows convert button enabled for won leads', () => {
    render(
      <ConvertLeadDialog
        lead={makeLead({ stage: 'won' })}
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
        lead={makeLead({ stage: 'new' })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/must be in/i)).toBeDefined();
    const button = screen.getByRole('button', { name: /convert to opportunity/i });
    expect(button).toBeDisabled();
  });

  it('pre-fills opportunity name from lead name', () => {
    render(
      <ConvertLeadDialog
        lead={makeLead({ lead_name: 'My Lead' })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Opportunity Name') as HTMLInputElement;
    expect(input.value).toBe('My Lead');
  });
});
