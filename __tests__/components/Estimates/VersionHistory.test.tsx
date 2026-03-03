'use client';

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { VersionHistory } from '@/components/Estimates/VersionHistory';
import type { EstimateVersion } from '@/hooks/useEstimates';

function makeVersion(overrides: Partial<EstimateVersion> = {}): EstimateVersion {
  return {
    id: 'ver-1',
    estimate_id: 'est-1',
    revision_no: 1,
    snapshot: {
      estimate: { estimate_number: 'EST-2026-001', subtotal_amount: 1000 },
      lines: [{ description: 'Test line', quantity: 5, unit_cost: 200 }],
      created_at: '2026-02-13T10:00:00Z',
    },
    reason: 'Initial version',
    created_by: 'user-1',
    created_at: '2026-02-13T10:00:00Z',
    ...overrides,
  };
}

describe('VersionHistory', () => {
  it('renders version list', () => {
    const versions = [
      makeVersion({
        id: 'ver-2',
        revision_no: 2,
        reason: 'Updated pricing',
        created_at: '2026-02-13T14:00:00Z',
      }),
      makeVersion({
        id: 'ver-1',
        revision_no: 1,
        reason: 'Initial version',
        created_at: '2026-02-13T10:00:00Z',
      }),
    ];
    render(<VersionHistory versions={versions} />);
    expect(screen.getByText(/Revision 2/)).toBeDefined();
    expect(screen.getByText(/Revision 1/)).toBeDefined();
    expect(screen.getByText('Updated pricing')).toBeDefined();
    expect(screen.getByText('Initial version')).toBeDefined();
  });

  it('shows empty state when no versions', () => {
    render(<VersionHistory versions={[]} />);
    expect(screen.getByText(/no versions/i)).toBeDefined();
  });

  it('shows expandable snapshot detail', () => {
    const versions = [makeVersion()];
    render(<VersionHistory versions={versions} />);
    // Click to expand
    const expandBtn = screen.getByRole('button', { name: /view snapshot/i });
    fireEvent.click(expandBtn);
    // Should show snapshot content
    expect(screen.getByText(/EST-2026-001/)).toBeDefined();
  });

  it('displays version creation dates', () => {
    const versions = [makeVersion({ created_at: '2026-02-13T10:00:00Z' })];
    render(<VersionHistory versions={versions} />);
    expect(screen.getByText(/Feb 13, 2026/)).toBeDefined();
  });
});
