import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConditionNode } from '@/components/CRM/FlowBuilder/ConditionNode';
import { FlowToolbar } from '@/components/CRM/FlowBuilder/FlowToolbar';
import { StepNode } from '@/components/CRM/FlowBuilder/StepNode';
import type { FlowStep } from '@/components/CRM/FlowBuilder/types';

const emailStep: FlowStep = {
  id: 'step-1',
  step_number: 1,
  action_type: 'email',
  action_config: { subject: 'Hello' },
  position_x: 0,
  position_y: 0,
};

const taskStep: FlowStep = {
  id: 'step-2',
  step_number: 2,
  action_type: 'task',
  action_config: { title: 'Call client' },
  position_x: 0,
  position_y: 100,
};

const waitStep: FlowStep = {
  id: 'step-3',
  step_number: 3,
  action_type: 'wait',
  action_config: {},
  delay_days: 2,
  position_x: 0,
  position_y: 200,
};

const conditionStep: FlowStep = {
  id: 'step-4',
  step_number: 4,
  action_type: 'condition',
  action_config: {},
  condition_type: 'if_score',
  condition_config: { min_score: 60 },
  position_x: 0,
  position_y: 300,
};

describe('FlowToolbar', () => {
  it('renders all add buttons', () => {
    render(<FlowToolbar onAddStep={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wait/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /condition/i })).toBeInTheDocument();
  });

  it('calls onAddStep with correct type when clicked', () => {
    const onAddStep = vi.fn();
    render(<FlowToolbar onAddStep={onAddStep} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /email/i }));
    expect(onAddStep).toHaveBeenCalledWith('email');
  });

  it('renders Save button and calls onSave', () => {
    const onSave = vi.fn();
    render(<FlowToolbar onAddStep={vi.fn()} onSave={onSave} />);
    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('StepNode', () => {
  it('renders email step', () => {
    render(<StepNode step={emailStep} selected={false} onSelect={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/email/i)).toBeInTheDocument();
  });

  it('renders task step', () => {
    render(<StepNode step={taskStep} selected={false} onSelect={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/task/i)).toBeInTheDocument();
  });

  it('renders wait step', () => {
    render(<StepNode step={waitStep} selected={false} onSelect={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/wait/i)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<StepNode step={emailStep} selected={false} onSelect={onSelect} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText(/email/i));
    expect(onSelect).toHaveBeenCalled();
  });

  it('shows delete button', () => {
    render(<StepNode step={emailStep} selected={false} onSelect={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});

describe('ConditionNode', () => {
  it('renders with condition type label', () => {
    render(
      <ConditionNode step={conditionStep} selected={false} onSelect={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText(/score check/i)).toBeInTheDocument();
  });

  it('shows Yes and No branch labels', () => {
    render(
      <ConditionNode step={conditionStep} selected={false} onSelect={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText(/yes/i)).toBeInTheDocument();
    expect(screen.getByText(/no/i)).toBeInTheDocument();
  });
});
