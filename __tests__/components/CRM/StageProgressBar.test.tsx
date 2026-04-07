import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { StageProgressBar } from '@/components/CRM/StageProgressBar';
describe('StageProgressBar', () => {
  it('renders all lead stages', () => {
    render(<StageProgressBar currentStage="new" />);
    expect(screen.getByText('New')).toBeDefined();
    expect(screen.getByText('Qualified')).toBeDefined();
    expect(screen.getByText('Contacted')).toBeDefined();
    expect(screen.getByText('Proposal')).toBeDefined();
    expect(screen.getByText('Negotiation')).toBeDefined();
    expect(screen.getByText('Won')).toBeDefined();
  });

  it('highlights the current stage', () => {
    const { container } = render(<StageProgressBar currentStage="proposal" />);
    // The current stage should have aria-current="step"
    const currentStep = container.querySelector('[aria-current="step"]');
    expect(currentStep).not.toBeNull();
    expect(currentStep?.textContent).toContain('Proposal');
  });

  it('marks visited stages before the current stage as completed', () => {
    // New order: new → qualified → contacted → proposal → negotiation → won
    // Stages before negotiation: new, qualified, contacted, proposal (4 stages)
    // Without stageHistory, only 'new' is guaranteed visited + current stage
    // Provide full history so all prior stages are marked completed
    const history = [
      { from_stage: null, to_stage: 'new' },
      { from_stage: 'new', to_stage: 'qualified' },
      { from_stage: 'qualified', to_stage: 'contacted' },
      { from_stage: 'contacted', to_stage: 'proposal' },
      { from_stage: 'proposal', to_stage: 'negotiation' },
    ];
    const { container } = render(
      <StageProgressBar currentStage="negotiation" stageHistory={history} />,
    );
    // new, qualified, contacted, proposal should be completed (4 stages before negotiation)
    const completedSteps = container.querySelectorAll('[data-completed="true"]');
    expect(completedSteps.length).toBe(4);
  });

  it('marks skipped stages with data-skipped when not in history', () => {
    // Lead jumped from new → negotiation (skipping qualified, contacted, proposal)
    const history = [{ from_stage: 'new', to_stage: 'negotiation' }];
    const { container } = render(
      <StageProgressBar currentStage="negotiation" stageHistory={history} />,
    );
    // new is visited (always), qualified/contacted/proposal are skipped
    const skippedSteps = container.querySelectorAll('[data-skipped="true"]');
    expect(skippedSteps.length).toBe(3);
    // new is the only completed stage before negotiation
    const completedSteps = container.querySelectorAll('[data-completed="true"]');
    expect(completedSteps.length).toBe(1);
  });

  it('handles the won stage correctly', () => {
    const history = [
      { from_stage: null, to_stage: 'new' },
      { from_stage: 'new', to_stage: 'qualified' },
      { from_stage: 'qualified', to_stage: 'contacted' },
      { from_stage: 'contacted', to_stage: 'proposal' },
      { from_stage: 'proposal', to_stage: 'negotiation' },
      { from_stage: 'negotiation', to_stage: 'won' },
    ];
    const { container } = render(<StageProgressBar currentStage="won" stageHistory={history} />);
    const currentStep = container.querySelector('[aria-current="step"]');
    expect(currentStep?.textContent).toContain('Won');
    // All 5 stages before won should be completed
    const completedSteps = container.querySelectorAll('[data-completed="true"]');
    expect(completedSteps.length).toBe(5);
  });

  it('handles the lost stage with distinct styling', () => {
    const { container } = render(<StageProgressBar currentStage="lost" />);
    const currentStep = container.querySelector('[aria-current="step"]');
    expect(currentStep?.textContent).toContain('Lost');
    // Lost stage should have data-lost attribute
    expect(currentStep?.getAttribute('data-lost')).toBe('true');
  });

  it('handles the new stage (first stage)', () => {
    const { container } = render(<StageProgressBar currentStage="new" />);
    const currentStep = container.querySelector('[aria-current="step"]');
    expect(currentStep?.textContent).toContain('New');
    // No stages should be completed (new is current, nothing before it)
    const completedSteps = container.querySelectorAll('[data-completed="true"]');
    expect(completedSteps.length).toBe(0);
  });

  it('without stageHistory, only new is completed before later stages', () => {
    // Without history, visited = {new, currentStage}. Stages in between are skipped.
    const { container } = render(<StageProgressBar currentStage="proposal" />);
    // new → qualified → contacted → proposal (current)
    // new is always visited → completed; qualified, contacted are skipped
    const completedSteps = container.querySelectorAll('[data-completed="true"]');
    expect(completedSteps.length).toBe(1);
    const skippedSteps = container.querySelectorAll('[data-skipped="true"]');
    expect(skippedSteps.length).toBe(2);
  });
});
