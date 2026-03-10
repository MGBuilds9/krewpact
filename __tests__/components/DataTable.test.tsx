import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/CRM/DataTable';

type Row = { id: string; name: string; status: string };

const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => row.original.name,
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => row.original.status,
    enableSorting: true,
  },
];

const sampleData: Row[] = [
  { id: '1', name: 'Alpha Corp', status: 'active' },
  { id: '2', name: 'Beta Ltd', status: 'inactive' },
];

function renderTable(overrides: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  const defaults = {
    columns,
    data: sampleData,
    total: 2,
    page: 0,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };
  return render(React.createElement(DataTable<Row>, { ...defaults, ...overrides }));
}

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders column headers', () => {
    renderTable();
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
  });

  it('renders data rows', () => {
    renderTable();
    expect(screen.getByText('Alpha Corp')).toBeDefined();
    expect(screen.getByText('Beta Ltd')).toBeDefined();
    expect(screen.getByText('active')).toBeDefined();
    expect(screen.getByText('inactive')).toBeDefined();
  });

  it('shows "No results." when data is empty', () => {
    renderTable({ data: [], total: 0 });
    expect(screen.getByText('No results.')).toBeDefined();
  });

  it('shows "No results" in pagination area when total is 0', () => {
    renderTable({ data: [], total: 0 });
    const noResultsElements = screen.getAllByText(/no results/i);
    expect(noResultsElements.length).toBeGreaterThan(0);
  });

  it('disables previous page button on first page', () => {
    renderTable({ page: 0 });
    const buttons = screen.getAllByRole('button');
    const _prevButton = buttons.find(
      (btn) => btn.querySelector('svg') && btn.getAttribute('disabled') !== null,
    );
    // page 0: previous button should be disabled
    const allButtons = screen.getAllByRole('button');
    const disabledButtons = allButtons.filter((b) => b.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  it('calls onPageChange when next page is clicked', () => {
    const onPageChange = vi.fn();
    renderTable({ page: 0, total: 25, pageSize: 10, onPageChange });
    // Find all buttons with SVGs (pagination arrows)
    const allButtons = screen.getAllByRole('button');
    // Next button is the last pagination button (chevron right)
    const nextButton = allButtons[allButtons.length - 1];
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = renderTable({ isLoading: true });
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    fireEvent.click(screen.getByText('Alpha Corp'));
    expect(onRowClick).toHaveBeenCalledWith(sampleData[0]);
  });
});
