'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type ScoringRuleRow, ScoringRulesTable } from '@/components/CRM/ScoringRulesTable';

function makeRuleRow(overrides: Partial<ScoringRuleRow> = {}): ScoringRuleRow {
  return {
    id: 'rule-1',
    name: 'Referral Bonus',
    field_name: 'source',
    operator: 'equals',
    value: 'referral',
    score_impact: 20,
    category: 'fit',
    is_active: true,
    ...overrides,
  };
}

describe('ScoringRulesTable', () => {
  it('renders empty state when no rules', () => {
    render(<ScoringRulesTable rules={[]} />);
    expect(screen.getByText(/No scoring rules configured/)).toBeDefined();
  });

  it('renders rule rows', () => {
    const rules = [
      makeRuleRow(),
      makeRuleRow({
        id: 'rule-2',
        name: 'High Value',
        field_name: 'estimated_value',
        operator: 'greater_than',
        value: '100000',
        score_impact: 30,
        category: 'intent',
      }),
    ];
    render(<ScoringRulesTable rules={rules} />);
    expect(screen.getByText('Referral Bonus')).toBeDefined();
    expect(screen.getByText('High Value')).toBeDefined();
    expect(screen.getByText('Equals')).toBeDefined();
    expect(screen.getByText('Greater Than')).toBeDefined();
  });

  it('displays score with sign', () => {
    const rules = [
      makeRuleRow({ score_impact: 20 }),
      makeRuleRow({ id: 'rule-2', name: 'Penalty', score_impact: -5 }),
    ];
    render(<ScoringRulesTable rules={rules} />);
    expect(screen.getByText('+20')).toBeDefined();
    expect(screen.getByText('-5')).toBeDefined();
  });

  it('renders category badges', () => {
    const rules = [
      makeRuleRow({ category: 'fit' }),
      makeRuleRow({ id: 'rule-2', name: 'Intent Rule', category: 'intent' }),
      makeRuleRow({ id: 'rule-3', name: 'Engagement Rule', category: 'engagement' }),
    ];
    render(<ScoringRulesTable rules={rules} />);
    expect(screen.getByText('fit')).toBeDefined();
    expect(screen.getByText('intent')).toBeDefined();
    expect(screen.getByText('engagement')).toBeDefined();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    const rule = makeRuleRow();
    render(<ScoringRulesTable rules={[rule]} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(rule);
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    const rule = makeRuleRow();
    render(<ScoringRulesTable rules={[rule]} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('rule-1');
  });

  it('shows dash for exists/not_exists operator values', () => {
    const rules = [makeRuleRow({ operator: 'exists', value: '' })];
    render(<ScoringRulesTable rules={rules} />);
    expect(screen.getByText('-')).toBeDefined();
  });
});
