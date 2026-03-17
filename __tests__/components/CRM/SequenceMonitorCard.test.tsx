'use client';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockProcessMutate = vi.fn();
const mockUseSequenceEnrollments = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useSequenceEnrollments: (...args: unknown[]) => mockUseSequenceEnrollments(...args),
  useProcessSequences: () => ({ mutate: mockProcessMutate, isPending: false }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
}));

import { SequenceMonitorCard } from '@/components/CRM/SequenceMonitorCard';

const mockAnalytics = {
  sequence_id: 'seq-1',
  sequence_name: 'Welcome Drip',
  is_active: true,
  total_steps: 5,
  enrollments: { active: 3, completed: 10, paused: 1, failed: 0, total: 14 },
};

describe('SequenceMonitorCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSequenceEnrollments.mockReturnValue({ data: [] });
  });

  it('renders sequence name and status badge', () => {
    render(<SequenceMonitorCard analytics={mockAnalytics} />);
    expect(screen.getByText('Welcome Drip')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows enrollment count breakdown', () => {
    render(<SequenceMonitorCard analytics={mockAnalytics} />);
    // Active: 3, Done: 10, Paused: 1, Failed: 0
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows completion rate', () => {
    render(<SequenceMonitorCard analytics={mockAnalytics} />);
    // 10/14 = 71.4% -> rounded to 71%
    expect(screen.getByText('71% (10/14)')).toBeInTheDocument();
  });

  it('shows step count', () => {
    render(<SequenceMonitorCard analytics={mockAnalytics} />);
    expect(screen.getByText('5 steps in sequence')).toBeInTheDocument();
  });

  it('renders with zero enrollments', () => {
    const zeroAnalytics = {
      ...mockAnalytics,
      enrollments: { active: 0, completed: 0, paused: 0, failed: 0, total: 0 },
    };
    render(<SequenceMonitorCard analytics={zeroAnalytics} />);
    expect(screen.getByText('0% (0/0)')).toBeInTheDocument();
  });
});
