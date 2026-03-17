import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { StageProgressBar } from '@/components/CRM/StageProgressBar';
describe('StageProgressBar', () => {
  it('renders all lead stages', () => {
    render(<StageProgressBar currentStage="new" />);
    expect(screen.getByText('New')).toBeDefined();
    expect(screen.getByText('Contacted')).toBeDefined();
    expect(screen.getByText('Qualified')).toBeDefined();
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

  it('marks completed stages before the current stage', () => {
    const { container } = render(<StageProgressBar currentStage="negotiation" />);
    // Stages before negotiation should be marked as completed (data-completed)
    const completedSteps = container.querySelectorAll('[data-completed="true"]');
    // new, contacted, qualified, proposal should be completed (4 stages before negotiation)
    expect(completedSteps.length).toBe(4);
  });

  it('handles the won stage correctly', () => {
    const { container } = render(<StageProgressBar currentStage="won" />);
    const currentStep = container.querySelector('[aria-current="step"]');
    expect(currentStep?.textContent).toContain('Won');
    // All stages before won should be completed
    const completedSteps = container.querySelectorAll('[data-completed="true"]');
    expect(completedSteps.length).toBe(5); // new, contacted, qualified, proposal, negotiation
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
    // No stages should be completed
    const completedSteps = container.querySelectorAll('[data-completed="true"]');
    expect(completedSteps.length).toBe(0);
  });
});
