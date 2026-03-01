import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DuplicateWarningDialog } from '@/components/CRM/DuplicateWarningDialog';
import type { DuplicateMatch } from '@/lib/crm/duplicate-detector';

const mockMatches: DuplicateMatch[] = [
  {
    id: 'lead-1',
    matchType: 'exact_domain',
    similarity: 1.0,
    matchedField: 'domain',
    matchedValue: 'mdmcontracting.ca',
    entity: { id: 'lead-1', company_name: 'MDM Contracting' },
  },
  {
    id: 'lead-2',
    matchType: 'fuzzy_name',
    similarity: 0.75,
    matchedField: 'company_name',
    matchedValue: 'MDM Homes',
    entity: { id: 'lead-2', company_name: 'MDM Homes' },
  },
];

describe('DuplicateWarningDialog', () => {
  it('renders with correct heading', () => {
    render(
      <DuplicateWarningDialog
        matches={mockMatches}
        entityType="lead"
        onMerge={vi.fn()}
        onForceCreate={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Potential Duplicates Found')).toBeInTheDocument();
  });

  it('shows all matches', () => {
    render(
      <DuplicateWarningDialog
        matches={mockMatches}
        entityType="lead"
        onMerge={vi.fn()}
        onForceCreate={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('mdmcontracting.ca')).toBeInTheDocument();
    expect(screen.getByText('MDM Homes')).toBeInTheDocument();
    expect(screen.getByText('100% match')).toBeInTheDocument();
    expect(screen.getByText('75% match')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn();
    render(
      <DuplicateWarningDialog
        matches={mockMatches}
        entityType="lead"
        onMerge={vi.fn()}
        onForceCreate={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onForceCreate when Create Anyway clicked', () => {
    const onForceCreate = vi.fn();
    render(
      <DuplicateWarningDialog
        matches={mockMatches}
        entityType="lead"
        onMerge={vi.fn()}
        onForceCreate={onForceCreate}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Create Anyway'));
    expect(onForceCreate).toHaveBeenCalledOnce();
  });

  it('Merge button is disabled until a match is selected', () => {
    render(
      <DuplicateWarningDialog
        matches={mockMatches}
        entityType="lead"
        onMerge={vi.fn()}
        onForceCreate={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const mergeBtn = screen.getByText('Merge');
    expect(mergeBtn).toBeDisabled();
  });

  it('calls onMerge with selected match ID when Merge clicked', () => {
    const onMerge = vi.fn();
    render(
      <DuplicateWarningDialog
        matches={mockMatches}
        entityType="lead"
        onMerge={onMerge}
        onForceCreate={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Select first match
    fireEvent.click(screen.getByText('mdmcontracting.ca'));

    // Click merge
    fireEvent.click(screen.getByText('Merge'));
    expect(onMerge).toHaveBeenCalledWith('lead-1');
  });

  it('shows correct entity type in description', () => {
    render(
      <DuplicateWarningDialog
        matches={mockMatches}
        entityType="contact"
        onMerge={vi.fn()}
        onForceCreate={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/2 potential duplicate contact/)).toBeInTheDocument();
  });
});
