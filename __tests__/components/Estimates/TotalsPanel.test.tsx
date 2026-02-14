'use client';

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TotalsPanel } from '@/components/Estimates/TotalsPanel';

describe('TotalsPanel', () => {
  it('formats currency as CAD', () => {
    render(
      <TotalsPanel subtotal={5000} taxAmount={650} total={5650} />,
    );
    expect(screen.getByText('$5,000.00')).toBeDefined();
    expect(screen.getByText('$650.00')).toBeDefined();
    expect(screen.getByText('$5,650.00')).toBeDefined();
  });

  it('shows correct HST label', () => {
    render(
      <TotalsPanel subtotal={1000} taxAmount={130} total={1130} />,
    );
    expect(screen.getByText(/HST 13%/)).toBeDefined();
  });

  it('handles zero values', () => {
    render(
      <TotalsPanel subtotal={0} taxAmount={0} total={0} />,
    );
    // All three values render as $0.00
    const zeroValues = screen.getAllByText('$0.00');
    expect(zeroValues.length).toBe(3);
  });

  it('handles large numbers', () => {
    render(
      <TotalsPanel subtotal={1234567.89} taxAmount={160493.83} total={1395061.72} />,
    );
    expect(screen.getByText('$1,234,567.89')).toBeDefined();
    expect(screen.getByText('$160,493.83')).toBeDefined();
    expect(screen.getByText('$1,395,061.72')).toBeDefined();
  });

  it('displays subtotal, tax, and total labels', () => {
    render(
      <TotalsPanel subtotal={100} taxAmount={13} total={113} />,
    );
    expect(screen.getByText('Subtotal')).toBeDefined();
    expect(screen.getByText('Total')).toBeDefined();
  });
});
