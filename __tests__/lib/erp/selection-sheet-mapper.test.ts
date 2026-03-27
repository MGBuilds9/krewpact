import { describe, expect, it } from 'vitest';

import {
  type SelectionChoiceInput,
  type SelectionSheetInput,
  toErpSelectionSheet,
} from '@/lib/erp/selection-sheet-mapper';

function makeSheet(overrides: Partial<SelectionSheetInput> = {}): SelectionSheetInput {
  return {
    id: 'sheet-001',
    project_id: 'proj-001',
    project_name: 'Lakeview Homes - Unit 4B',
    title: 'Kitchen Countertop Selection',
    category: 'Finishes',
    status: 'pending',
    allowance_amount: 5000.0,
    currency_code: 'CAD',
    ...overrides,
  };
}

function makeChoices(): SelectionChoiceInput[] {
  return [
    {
      option_name: 'Quartz - White Marble',
      supplier_name: 'Stone World Inc.',
      unit_cost: 85.0,
      quantity: 30,
      total_cost: 2550.0,
      is_selected: true,
    },
    {
      option_name: 'Granite - Black Pearl',
      supplier_name: 'GraniteSource',
      unit_cost: 95.0,
      quantity: 30,
      total_cost: 2850.0,
      is_selected: false,
    },
  ];
}

describe('toErpSelectionSheet', () => {
  it('maps all sheet fields correctly', () => {
    const result = toErpSelectionSheet(makeSheet(), makeChoices());
    expect(result.project).toBe('Lakeview Homes - Unit 4B');
    expect(result.title).toBe('Kitchen Countertop Selection');
    expect(result.category).toBe('Finishes');
    expect(result.status).toBe('pending');
    expect(result.allowance_amount).toBe(5000.0);
    expect(result.currency).toBe('CAD');
    expect(result.custom_mdm_selection_id).toBe('sheet-001');
    expect(result.custom_mdm_project_id).toBe('proj-001');
  });

  it('maps choices correctly', () => {
    const result = toErpSelectionSheet(makeSheet(), makeChoices());
    const options = result.options as Record<string, unknown>[];
    expect(options).toHaveLength(2);
    expect(options[0].option_name).toBe('Quartz - White Marble');
    expect(options[0].supplier).toBe('Stone World Inc.');
    expect(options[0].rate).toBe(85.0);
    expect(options[0].qty).toBe(30);
    expect(options[0].amount).toBe(2550.0);
    expect(options[0].selected).toBe(1);
    expect(options[0].idx).toBe(1);
    expect(options[1].selected).toBe(0);
    expect(options[1].idx).toBe(2);
  });

  it('defaults currency to CAD when null', () => {
    const result = toErpSelectionSheet(makeSheet({ currency_code: null }), makeChoices());
    expect(result.currency).toBe('CAD');
  });

  it('defaults project to empty string when project_name is null', () => {
    const result = toErpSelectionSheet(makeSheet({ project_name: null }), makeChoices());
    expect(result.project).toBe('');
  });

  it('defaults category to empty string when null', () => {
    const result = toErpSelectionSheet(makeSheet({ category: null }), makeChoices());
    expect(result.category).toBe('');
  });

  it('defaults allowance_amount to 0 when null', () => {
    const result = toErpSelectionSheet(makeSheet({ allowance_amount: null }), makeChoices());
    expect(result.allowance_amount).toBe(0);
  });

  it('defaults choice supplier to empty string when null', () => {
    const result = toErpSelectionSheet(makeSheet(), [
      {
        option_name: 'No-brand tile',
        supplier_name: null,
        unit_cost: 20,
        quantity: 10,
        total_cost: 200,
        is_selected: false,
      },
    ]);
    const options = result.options as Record<string, unknown>[];
    expect(options[0].supplier).toBe('');
  });

  it('handles empty choices array', () => {
    const result = toErpSelectionSheet(makeSheet(), []);
    expect(result.options).toEqual([]);
  });

  it('maps custom fields with correct key names', () => {
    const result = toErpSelectionSheet(makeSheet(), makeChoices());
    expect(Object.keys(result)).toContain('custom_mdm_selection_id');
    expect(Object.keys(result)).toContain('custom_mdm_project_id');
  });
});
