'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SequenceStepEditor } from '@/components/CRM/SequenceStepEditor';
import type { SequenceStep } from '@/hooks/useCRM';

function makeStep(overrides: Partial<SequenceStep> = {}): SequenceStep {
  return {
    id: 'step-1',
    sequence_id: 'seq-1',
    step_number: 1,
    action_type: 'email',
    action_config: { subject: 'Follow up' },
    delay_days: 1,
    delay_hours: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SequenceStepEditor', () => {
  it('renders empty state with add button', () => {
    const onAdd = vi.fn();
    render(
      <SequenceStepEditor
        sequenceId="seq-1"
        steps={[]}
        onAddStep={onAdd}
        onEditStep={vi.fn()}
        onDeleteStep={vi.fn()}
      />,
    );

    expect(screen.getByText(/No steps yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add First Step/ })).toBeInTheDocument();
  });

  it('calls onAddStep when add button clicked (empty state)', () => {
    const onAdd = vi.fn();
    render(
      <SequenceStepEditor
        sequenceId="seq-1"
        steps={[]}
        onAddStep={onAdd}
        onEditStep={vi.fn()}
        onDeleteStep={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Add First Step/ }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('renders steps with correct info', () => {
    const steps = [
      makeStep({
        id: 'step-1',
        step_number: 1,
        action_type: 'email',
        action_config: { subject: 'Hello' },
        delay_days: 2,
        delay_hours: 0,
      }),
      makeStep({
        id: 'step-2',
        step_number: 2,
        action_type: 'task',
        action_config: { title: 'Call client' },
        delay_days: 0,
        delay_hours: 4,
      }),
      makeStep({
        id: 'step-3',
        step_number: 3,
        action_type: 'wait',
        action_config: {},
        delay_days: 0,
        delay_hours: 0,
      }),
    ];

    render(
      <SequenceStepEditor
        sequenceId="seq-1"
        steps={steps}
        onAddStep={vi.fn()}
        onEditStep={vi.fn()}
        onDeleteStep={vi.fn()}
      />,
    );

    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Call client')).toBeInTheDocument();
    expect(screen.getByText(/2 day/)).toBeInTheDocument();
    expect(screen.getByText(/4 hour/)).toBeInTheDocument();
    expect(screen.getByText(/Immediately/)).toBeInTheDocument();
  });

  it('calls onEditStep when edit button clicked', () => {
    const onEdit = vi.fn();
    const step = makeStep();
    render(
      <SequenceStepEditor
        sequenceId="seq-1"
        steps={[step]}
        onAddStep={vi.fn()}
        onEditStep={onEdit}
        onDeleteStep={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Edit step 1/ }));
    expect(onEdit).toHaveBeenCalledWith(step);
  });

  it('calls onDeleteStep when delete button clicked', () => {
    const onDelete = vi.fn();
    const step = makeStep();
    render(
      <SequenceStepEditor
        sequenceId="seq-1"
        steps={[step]}
        onAddStep={vi.fn()}
        onEditStep={vi.fn()}
        onDeleteStep={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Delete step 1/ }));
    expect(onDelete).toHaveBeenCalledWith('step-1');
  });

  it('shows add step button at the bottom when steps exist', () => {
    render(
      <SequenceStepEditor
        sequenceId="seq-1"
        steps={[makeStep()]}
        onAddStep={vi.fn()}
        onEditStep={vi.fn()}
        onDeleteStep={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Add Step/ })).toBeInTheDocument();
  });
});
