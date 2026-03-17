import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMergeAccountsMutateAsync = vi.fn();
const mockMergeContactsMutateAsync = vi.fn();
let mockAccountsPending = false;
let mockContactsPending = false;

vi.mock('@/hooks/useCRM', () => ({
  useMergeAccounts: () => ({
    mutateAsync: mockMergeAccountsMutateAsync,
    isPending: mockAccountsPending,
  }),
  useMergeContacts: () => ({
    mutateAsync: mockMergeContactsMutateAsync,
    isPending: mockContactsPending,
  }),
}));

import { MergeDialog } from '@/components/CRM/MergeDialog';

const accountEntities = [
  {
    id: 'acct-1',
    account_name: 'Acme Corp',
    account_type: 'Client',
    billing_address: '123 Main St',
    notes: 'Good customer',
  },
  {
    id: 'acct-2',
    account_name: 'Acme Inc',
    account_type: 'Prospect',
    billing_address: '456 Oak Ave',
    notes: 'Duplicate of Acme Corp',
  },
];

const contactEntities = [
  {
    id: 'contact-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    role_title: 'CEO',
  },
  {
    id: 'contact-2',
    first_name: 'Johnny',
    last_name: 'Doe',
    email: 'johnny@example.com',
    phone: '555-5678',
    role_title: 'President',
  },
];

describe('MergeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountsPending = false;
    mockContactsPending = false;
    mockMergeAccountsMutateAsync.mockResolvedValue({
      primaryId: 'acct-1',
      secondaryId: 'acct-2',
      mergedFields: [],
      reassignedRelations: [],
    });
    mockMergeContactsMutateAsync.mockResolvedValue({
      primaryId: 'contact-1',
      secondaryId: 'contact-2',
      mergedFields: [],
      reassignedRelations: [],
    });
  });

  it('renders dialog when open=true', () => {
    render(
      <MergeDialog
        open={true}
        onOpenChange={vi.fn()}
        entityType="account"
        entities={accountEntities}
        onMergeComplete={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/Merge Accounts/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Select the primary record/)).toBeInTheDocument();
  });

  it('shows both entities side by side', () => {
    render(
      <MergeDialog
        open={true}
        onOpenChange={vi.fn()}
        entityType="account"
        entities={accountEntities}
        onMergeComplete={vi.fn()}
      />,
    );
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
  });

  it('allows selecting primary entity', () => {
    render(
      <MergeDialog
        open={true}
        onOpenChange={vi.fn()}
        entityType="account"
        entities={accountEntities}
        onMergeComplete={vi.fn()}
      />,
    );
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(2);
    fireEvent.click(radioButtons[0]);
    expect(radioButtons[0]).toBeChecked();
  });

  it('calls merge mutation on submit', async () => {
    const onMergeComplete = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <MergeDialog
        open={true}
        onOpenChange={onOpenChange}
        entityType="account"
        entities={accountEntities}
        onMergeComplete={onMergeComplete}
      />,
    );

    // Select primary
    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);

    // Click merge
    const mergeButton = screen.getByRole('button', { name: /merge accounts/i });
    fireEvent.click(mergeButton);

    await waitFor(() => {
      expect(mockMergeAccountsMutateAsync).toHaveBeenCalledWith({
        primary_id: 'acct-1',
        secondary_id: 'acct-2',
      });
    });

    await waitFor(() => {
      expect(onMergeComplete).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows loading state during merge', () => {
    mockAccountsPending = true;
    // Re-import won't work with module cache, so we test via button text
    // The component reads isPending from the hook each render
    render(
      <MergeDialog
        open={true}
        onOpenChange={vi.fn()}
        entityType="account"
        entities={accountEntities}
        onMergeComplete={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /merging/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /merging/i })).toBeDisabled();
  });

  it('closes dialog on cancel', () => {
    const onOpenChange = vi.fn();
    render(
      <MergeDialog
        open={true}
        onOpenChange={onOpenChange}
        entityType="account"
        entities={accountEntities}
        onMergeComplete={vi.fn()}
      />,
    );
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles account merge with correct fields displayed', () => {
    render(
      <MergeDialog
        open={true}
        onOpenChange={vi.fn()}
        entityType="account"
        entities={accountEntities}
        onMergeComplete={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Account Name')).toHaveLength(2);
    expect(screen.getAllByText('Account Type')).toHaveLength(2);
    expect(screen.getAllByText('Billing Address')).toHaveLength(2);
    expect(screen.getAllByText('Notes')).toHaveLength(2);
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Prospect')).toBeInTheDocument();
  });

  it('handles contact merge with correct fields displayed', () => {
    render(
      <MergeDialog
        open={true}
        onOpenChange={vi.fn()}
        entityType="contact"
        entities={contactEntities}
        onMergeComplete={vi.fn()}
      />,
    );
    expect(screen.getAllByText('First Name')).toHaveLength(2);
    expect(screen.getAllByText('Last Name')).toHaveLength(2);
    expect(screen.getAllByText('Email')).toHaveLength(2);
    expect(screen.getAllByText('Phone')).toHaveLength(2);
    expect(screen.getAllByText('Role / Title')).toHaveLength(2);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('johnny@example.com')).toBeInTheDocument();
    expect(screen.getByText('CEO')).toBeInTheDocument();
    expect(screen.getByText('President')).toBeInTheDocument();
  });

  it('disables merge when no primary selected', () => {
    render(
      <MergeDialog
        open={true}
        onOpenChange={vi.fn()}
        entityType="account"
        entities={accountEntities}
        onMergeComplete={vi.fn()}
      />,
    );
    const mergeButton = screen.getByRole('button', { name: /merge accounts/i });
    expect(mergeButton).toBeDisabled();
  });

  it('shows entity field values correctly including empty values', () => {
    const entitiesWithNulls = [
      {
        id: 'acct-1',
        account_name: 'Test Corp',
        account_type: null,
        billing_address: '',
        notes: 'Some notes',
      },
      {
        id: 'acct-2',
        account_name: 'Test Inc',
        account_type: 'Vendor',
        billing_address: '789 Elm St',
        notes: null,
      },
    ];
    render(
      <MergeDialog
        open={true}
        onOpenChange={vi.fn()}
        entityType="account"
        entities={entitiesWithNulls}
        onMergeComplete={vi.fn()}
      />,
    );
    // Null and empty values should show as em dash
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Test Corp')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
  });
});
