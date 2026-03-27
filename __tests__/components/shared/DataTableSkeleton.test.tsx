import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton';

function countAnimatedElements(container: HTMLElement) {
  return container.querySelectorAll('[class*="animate-pulse"]').length;
}

describe('DataTableSkeleton', () => {
  it('renders with default props', () => {
    const { container } = render(<DataTableSkeleton />);
    expect(countAnimatedElements(container)).toBeGreaterThan(0);
  });

  it('renders header row by default (showHeader=true)', () => {
    const { container } = render(<DataTableSkeleton showHeader columns={4} />);
    // Header row is outside the bordered table div
    expect(countAnimatedElements(container)).toBeGreaterThan(4);
  });

  it('does not render header when showHeader=false', () => {
    const { container: withHeader } = render(
      <DataTableSkeleton showHeader={true} columns={4} rows={3} />,
    );
    const { container: noHeader } = render(
      <DataTableSkeleton showHeader={false} columns={4} rows={3} />,
    );
    expect(countAnimatedElements(withHeader)).toBeGreaterThan(countAnimatedElements(noHeader));
  });

  it('renders correct number of row cells (rows * columns)', () => {
    // With showHeader=false and showPagination=false, count = rows * columns
    const { container } = render(
      <DataTableSkeleton rows={3} columns={2} showHeader={false} showPagination={false} />,
    );
    expect(countAnimatedElements(container)).toBe(6);
  });

  it('renders pagination skeletons by default', () => {
    const { container: withPag } = render(
      <DataTableSkeleton showHeader={false} rows={1} columns={1} showPagination={true} />,
    );
    const { container: noPag } = render(
      <DataTableSkeleton showHeader={false} rows={1} columns={1} showPagination={false} />,
    );
    expect(countAnimatedElements(withPag)).toBeGreaterThan(countAnimatedElements(noPag));
  });

  it('does not render pagination when showPagination=false', () => {
    const { container } = render(
      <DataTableSkeleton rows={2} columns={2} showHeader={false} showPagination={false} />,
    );
    // Only 2*2 = 4 cells
    expect(countAnimatedElements(container)).toBe(4);
  });

  it('applies custom className', () => {
    const { container } = render(<DataTableSkeleton className="my-custom-class" />);
    expect(container.firstElementChild?.className).toContain('my-custom-class');
  });
});
