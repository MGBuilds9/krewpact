'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatStatus } from '@/lib/format-status';

export interface RuleFormState {
  name: string;
  category: 'fit' | 'intent' | 'engagement';
  field_name: string;
  operator: string;
  value: string;
  score_impact: string;
  is_active: boolean;
}

const OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'exists',
  'not_exists',
];

interface RuleFormFieldsProps {
  form: RuleFormState;
  onChange: (f: RuleFormState) => void;
}

// eslint-disable-next-line max-lines-per-function
export function RuleFormFields({ form, onChange }: RuleFormFieldsProps) {
  function set(field: keyof RuleFormState, value: string | boolean) {
    onChange({ ...form, [field]: value });
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <Label className="text-xs">Rule Name</Label>
        <Input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. High revenue industry"
        />
      </div>
      <div>
        <Label className="text-xs">Category</Label>
        <Select value={form.category} onValueChange={(v) => set('category', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fit">Fit</SelectItem>
            <SelectItem value="intent">Intent</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Field Name</Label>
        <Input
          value={form.field_name}
          onChange={(e) => set('field_name', e.target.value)}
          placeholder="e.g. industry, company_size"
        />
      </div>
      <div>
        <Label className="text-xs">Operator</Label>
        <Select value={form.operator} onValueChange={(v) => set('operator', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((op) => (
              <SelectItem key={op} value={op}>
                {formatStatus(op)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Value</Label>
        <Input
          value={form.value}
          onChange={(e) => set('value', e.target.value)}
          placeholder="e.g. construction"
        />
      </div>
      <div>
        <Label className="text-xs">Score Impact</Label>
        <Input
          type="number"
          value={form.score_impact}
          onChange={(e) => set('score_impact', e.target.value)}
          placeholder="e.g. 10 or -5"
        />
      </div>
      <div>
        <Label className="text-xs">Status</Label>
        <Select
          value={form.is_active ? 'active' : 'inactive'}
          onValueChange={(v) => set('is_active', v === 'active')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
