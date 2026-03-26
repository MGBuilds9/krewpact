'use client';

import { useState } from 'react';

import { ScoringRulesTable, type ScoringRuleRow } from '@/components/CRM/ScoringRulesTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ScoringRule } from '@/hooks/useCRM';
import {
  useCreateScoringRule,
  useDeleteScoringRule,
  useScoringRules,
  useUpdateScoringRule,
} from '@/hooks/useCRM';

const EMPTY_RULE: Partial<ScoringRule> = {
  name: '',
  field_name: 'source',
  operator: 'equals',
  value: '',
  score_impact: 10,
  category: 'fit',
  is_active: true,
};

const FIELD_OPTIONS = [
  { value: 'source', label: 'Source' },
  { value: 'estimated_value', label: 'Estimated Value' },
  { value: 'company_name', label: 'Company Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'stage', label: 'Stage' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'exists', label: 'Exists' },
  { value: 'not_exists', label: 'Not Exists' },
];

const CATEGORY_OPTIONS = [
  { value: 'fit', label: 'Fit' },
  { value: 'intent', label: 'Intent' },
  { value: 'engagement', label: 'Engagement' },
];

interface RuleFormProps {
  form: Partial<ScoringRule>;
  editingId: string | null;
  isPending: boolean;
  setForm: (f: Partial<ScoringRule>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function ScoringRuleForm({
  form,
  editingId,
  isPending,
  setForm,
  onSubmit,
  onCancel,
}: RuleFormProps) {
  const noValue = form.operator === 'exists' || form.operator === 'not_exists';
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="text-sm font-medium" htmlFor="rule-name">
          Rule Name
        </label>
        <input
          id="rule-name"
          type="text"
          className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
          value={form.name ?? ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="rule-field">
          Field
        </label>
        <select
          id="rule-field"
          className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
          value={form.field_name ?? 'source'}
          onChange={(e) => setForm({ ...form, field_name: e.target.value })}
        >
          {FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="rule-operator">
          Operator
        </label>
        <select
          id="rule-operator"
          className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
          value={form.operator ?? 'equals'}
          onChange={(e) => setForm({ ...form, operator: e.target.value })}
        >
          {OPERATOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="rule-value">
          Value
        </label>
        <input
          id="rule-value"
          type="text"
          className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
          value={form.value ?? ''}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          disabled={noValue}
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="rule-score">
          Score Impact
        </label>
        <input
          id="rule-score"
          type="number"
          className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
          value={form.score_impact ?? 0}
          onChange={(e) => setForm({ ...form, score_impact: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="rule-category">
          Category
        </label>
        <select
          id="rule-category"
          className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
          value={form.category ?? 'fit'}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {editingId ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </form>
  );
}

export default function ScoringSettingsPage() {
  const { data: rules = [], isLoading } = useScoringRules();
  const createRule = useCreateScoringRule();
  const updateRule = useUpdateScoringRule();
  const deleteRule = useDeleteScoringRule();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ScoringRule>>(EMPTY_RULE);

  function handleEdit(rule: ScoringRuleRow) { setForm(rule); setEditingId(rule.id); setShowForm(true); }
  function handleCancel() { setForm(EMPTY_RULE); setEditingId(null); setShowForm(false); }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) { await updateRule.mutateAsync({ id: editingId, ...form }); } else { await createRule.mutateAsync(form); }
    handleCancel();
  }

  if (isLoading) return <div className="p-6">Loading scoring rules...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Scoring Rules</h1>
          <p className="text-muted-foreground">Configure rules to automatically score leads based on their attributes.</p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)}>Add Rule</Button>}
      </div>
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Edit Rule' : 'New Scoring Rule'}</CardTitle>
            <CardDescription>Define the field, condition, and score impact for this rule.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoringRuleForm form={form} editingId={editingId} isPending={createRule.isPending || updateRule.isPending} setForm={setForm} onSubmit={handleSubmit} onCancel={handleCancel} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Active Rules</CardTitle></CardHeader>
        <CardContent>
          <ScoringRulesTable
            rules={rules}
            onToggleActive={(id, isActive) => updateRule.mutateAsync({ id, is_active: isActive })}
            onEdit={handleEdit}
            onDelete={(id) => deleteRule.mutateAsync(id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
