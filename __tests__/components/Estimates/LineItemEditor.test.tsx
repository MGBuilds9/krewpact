'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { LineItemEditor } from '@/components/Estimates/LineItemEditor';
import type { EstimateLine } from '@/hooks/useEstimates';

function makeLine(overrides: Partial<EstimateLine> = {}): EstimateLine {
  return {
    id: 'line-1',
    estimate_id: 'est-1',
    parent_line_id: null,
    line_type: 'item',
    description: 'Concrete foundation',
    quantity: 10,
    unit: 'cu yd',
    unit_cost: 150,
    markup_pct: 15,
    line_total: 1725,
    is_optional: false,
    sort_order: 1,
    created_at: '2026-02-13T10:00:00Z',
    updated_at: '2026-02-13T10:00:00Z',
    ...overrides,
  };
}

describe('LineItemEditor', () => {
  const defaultProps = {
    lines: [makeLine()],
    onAddLine: vi.fn(),
    onUpdateLine: vi.fn(),
    onDeleteLine: vi.fn(),
    isReadOnly: false,
  };

  it('renders line items with all columns', () => {
    render(<LineItemEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('Concrete foundation')).toBeDefined();
    expect(screen.getByDisplayValue('10')).toBeDefined();
    expect(screen.getByDisplayValue('150')).toBeDefined();
    expect(screen.getByDisplayValue('15')).toBeDefined();
    // line_total displayed (formatted)
    expect(screen.getByText('$1,725.00')).toBeDefined();
  });

  it('has an Add Line button', () => {
    render(<LineItemEditor {...defaultProps} />);
    expect(screen.getByText(/add line/i)).toBeDefined();
  });

  it('calls onAddLine when Add Line is clicked', () => {
    const onAddLine = vi.fn();
    render(<LineItemEditor {...defaultProps} onAddLine={onAddLine} />);
    fireEvent.click(screen.getByText(/add line/i));
    expect(onAddLine).toHaveBeenCalledTimes(1);
  });

  it('calls onDeleteLine when delete button is clicked', () => {
    const onDeleteLine = vi.fn();
    render(<LineItemEditor {...defaultProps} onDeleteLine={onDeleteLine} />);
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);
    expect(onDeleteLine).toHaveBeenCalledWith('line-1');
  });

  it('shows empty state when no lines', () => {
    render(<LineItemEditor {...defaultProps} lines={[]} />);
    expect(screen.getByText(/no line items/i)).toBeDefined();
  });

  it('sorts lines by sort_order', () => {
    const lines = [
      makeLine({ id: 'line-2', description: 'Rebar', sort_order: 2 }),
      makeLine({ id: 'line-1', description: 'Concrete', sort_order: 1 }),
    ];
    render(<LineItemEditor {...defaultProps} lines={lines} />);
    // Get all description inputs — should be ordered by sort_order
    const descInputs = screen.getAllByDisplayValue(/Concrete|Rebar/);
    expect((descInputs[0] as HTMLInputElement).value).toBe('Concrete');
    expect((descInputs[1] as HTMLInputElement).value).toBe('Rebar');
  });

  it('marks optional lines visually', () => {
    const lines = [makeLine({ is_optional: true, description: 'Optional finish' })];
    render(<LineItemEditor {...defaultProps} lines={lines} />);
    expect(screen.getByText(/optional/i)).toBeDefined();
  });

  it('hides edit controls in read-only mode', () => {
    render(<LineItemEditor {...defaultProps} isReadOnly={true} />);
    expect(screen.queryByText(/add line/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});
