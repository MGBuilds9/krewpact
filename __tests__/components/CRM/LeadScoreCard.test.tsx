'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LeadScoreCard } from '@/components/CRM/LeadScoreCard';

describe('LeadScoreCard', () => {
  it('renders the score value', () => {
    render(<LeadScoreCard score={75} />);
    expect(screen.getByTestId('lead-score-value').textContent).toBe('75');
  });

  it('shows Hot badge for score >= 70', () => {
    render(<LeadScoreCard score={70} />);
    expect(screen.getByText('Hot')).toBeDefined();
  });

  it('shows Warm badge for score 40-69', () => {
    render(<LeadScoreCard score={55} />);
    expect(screen.getByText('Warm')).toBeDefined();
  });

  it('shows Cold badge for score < 40', () => {
    render(<LeadScoreCard score={20} />);
    expect(screen.getByText('Cold')).toBeDefined();
  });

  it('displays category scores', () => {
    render(
      <LeadScoreCard score={60} fitScore={25} intentScore={20} engagementScore={15} />,
    );
    expect(screen.getByText('Fit')).toBeDefined();
    expect(screen.getByText('25')).toBeDefined();
    expect(screen.getByText('Intent')).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();
    expect(screen.getByText('Engagement')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();
  });

  it('renders recalculate button when handler provided', () => {
    const onRecalculate = vi.fn();
    render(<LeadScoreCard score={50} onRecalculate={onRecalculate} />);
    const button = screen.getByText('Recalculate Score');
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(onRecalculate).toHaveBeenCalledTimes(1);
  });

  it('does not render recalculate button when no handler', () => {
    render(<LeadScoreCard score={50} />);
    expect(screen.queryByText('Recalculate Score')).toBeNull();
  });

  it('shows recalculating state', () => {
    render(
      <LeadScoreCard score={50} onRecalculate={() => {}} isRecalculating={true} />,
    );
    expect(screen.getByText('Recalculating...')).toBeDefined();
  });

  it('renders zero score', () => {
    render(<LeadScoreCard score={0} />);
    expect(screen.getByTestId('lead-score-value').textContent).toBe('0');
    expect(screen.getByText('Cold')).toBeDefined();
  });
});
