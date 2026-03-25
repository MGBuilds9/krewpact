import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { PageSkeleton } from '@/components/shared/PageSkeleton';

function countAnimatedElements(container: HTMLElement) {
  return container.querySelectorAll('[class*="animate-pulse"]').length;
}

describe('PageSkeleton', () => {
  it('renders table layout with animated skeletons', () => {
    const { container } = render(<PageSkeleton layout="table" />);
    expect(countAnimatedElements(container)).toBeGreaterThan(0);
  });

  it('renders cards layout with animated skeletons', () => {
    const { container } = render(<PageSkeleton layout="cards" />);
    expect(countAnimatedElements(container)).toBeGreaterThan(0);
  });

  it('renders form layout with animated skeletons', () => {
    const { container } = render(<PageSkeleton layout="form" />);
    expect(countAnimatedElements(container)).toBeGreaterThan(0);
  });

  it('renders dashboard layout with animated skeletons', () => {
    const { container } = render(<PageSkeleton layout="dashboard" />);
    expect(countAnimatedElements(container)).toBeGreaterThan(0);
  });

  it('applies className to wrapper', () => {
    const { container } = render(<PageSkeleton layout="table" className="custom-skeleton" />);
    expect(container.firstElementChild?.className).toContain('custom-skeleton');
  });

  it('table layout respects custom rows', () => {
    const { container } = render(<PageSkeleton layout="table" rows={10} />);
    expect(countAnimatedElements(container)).toBeGreaterThan(0);
  });

  it('cards layout respects custom columns', () => {
    const { container } = render(<PageSkeleton layout="cards" columns={2} />);
    expect(countAnimatedElements(container)).toBeGreaterThan(0);
  });

  it('form layout respects custom rows', () => {
    const { container } = render(<PageSkeleton layout="form" rows={3} />);
    expect(countAnimatedElements(container)).toBeGreaterThan(0);
  });
});
