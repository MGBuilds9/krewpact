'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Sliders, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { formatStatus } from '@/lib/format-status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';

interface ScoringRule {
  id: string;
  name: string;
  category: 'fit' | 'intent' | 'engagement';
  field_name: string;
  operator: string;
  value: string;
  score_impact: number;
  is_active: boolean;
  priority: number | null;
  division_id: string | null;
  created_at: string;
}
interface RuleFormState {
  name: string;
  category: 'fit' | 'intent' | 'engagement';
  field_name: string;
  operator: string;
  value: string;
  score_impact: string;
  is_active: boolean;
}

const EMPTY_FORM: RuleFormState = {
  name: '',
  category: 'fit',
  field_name: '',
  operator: 'equals',
  value: '',
  score_impact: '0',
  is_active: true,
};
const CATEGORY_COLORS: Record<string, string> = {
  fit: 'bg-blue-100 text-blue-700 border-blue-200',
  intent: 'bg-purple-100 text-purple-700 border-purple-200',
  engagement: 'bg-green-100 text-green-700 border-green-200',
};
const OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'exists',
  'not_exists',
];

function useScoringRules() {
  return useQuery({
    queryKey: ['scoring-rules'],
    queryFn: () => apiFetch<ScoringRule[]>('/api/crm/scoring-rules'),
  });
}

interface RuleFormFieldsProps {
  form: RuleFormState;
  onChange: (f: RuleFormState) => void;
}
function RuleFormFields({ form, onChange }: RuleFormFieldsProps) {
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

interface RuleFormProps {
  form: RuleFormState;
  onChange: (f: RuleFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}
function RuleForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: RuleFormProps) {
  return (
    <div className="space-y-4">
      <RuleFormFields form={form} onChange={onChange} />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitting || !form.name || !form.field_name || !form.value}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}

interface RuleRowProps {
  rule: ScoringRule;
  onEdit: (r: ScoringRule) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}
function RuleRow({ rule, onEdit, onDelete, isDeleting }: RuleRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Badge
          variant="outline"
          className={`text-xs flex-shrink-0 border ${CATEGORY_COLORS[rule.category] || ''}`}
        >
          {rule.category}
        </Badge>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{rule.name}</p>
          <p className="text-xs text-muted-foreground">
            {rule.field_name} {rule.operator} &quot;{rule.value}&quot;
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        <span
          className={`text-sm font-bold tabular-nums ${rule.score_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          {rule.score_impact >= 0 ? '+' : ''}
          {rule.score_impact}
        </span>
        <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-xs">
          {rule.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(rule)}
            aria-label="Edit scoring rule"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(rule.id)}
            disabled={isDeleting}
            aria-label="Delete scoring rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ScoringRulesPage() {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useScoringRules();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['scoring-rules'] });
  const parseImpact = (f: RuleFormState) => ({
    ...f,
    score_impact: parseInt(f.score_impact, 10) || 0,
  });

  const createRule = useMutation({
    mutationFn: (data: ReturnType<typeof parseImpact>) =>
      apiFetch<ScoringRule>('/api/crm/scoring-rules', { method: 'POST', body: data }),
    onSuccess: () => {
      invalidate();
      setShowAddForm(false);
      setForm(EMPTY_FORM);
    },
  });
  const updateRule = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & ReturnType<typeof parseImpact>) =>
      apiFetch<ScoringRule>(`/api/crm/scoring-rules/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
  });
  const deleteRule = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/scoring-rules/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  function startEdit(rule: ScoringRule) {
    setEditingId(rule.id);
    setShowAddForm(false);
    setForm({
      name: rule.name,
      category: rule.category,
      field_name: rule.field_name,
      operator: rule.operator,
      value: rule.value,
      score_impact: String(rule.score_impact),
      is_active: rule.is_active,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const allRules = rules || [];
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Sliders className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Scoring Rules</h1>
          <p className="text-muted-foreground">
            Configure fit, intent, and engagement scoring criteria
          </p>
        </div>
      </div>
      <Button
        onClick={() => {
          setEditingId(null);
          setForm(EMPTY_FORM);
          setShowAddForm(true);
        }}
        disabled={showAddForm}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Rule
      </Button>
      {showAddForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Scoring Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <RuleForm
              form={form}
              onChange={setForm}
              onSubmit={() => createRule.mutate(parseImpact(form))}
              onCancel={() => {
                setShowAddForm(false);
                setForm(EMPTY_FORM);
              }}
              isSubmitting={createRule.isPending}
              submitLabel="Add Rule"
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scoring Rules</span>
            <Badge variant="secondary">{allRules.length} rules</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allRules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No scoring rules configured. Add a rule to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {allRules.map((rule) => (
                <div key={rule.id}>
                  {editingId === rule.id ? (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <RuleForm
                        form={form}
                        onChange={setForm}
                        onSubmit={() => updateRule.mutate({ id: rule.id, ...parseImpact(form) })}
                        onCancel={() => {
                          setEditingId(null);
                          setForm(EMPTY_FORM);
                        }}
                        isSubmitting={updateRule.isPending}
                        submitLabel="Save Changes"
                      />
                    </div>
                  ) : (
                    <RuleRow
                      rule={rule}
                      onEdit={startEdit}
                      onDelete={(id) => deleteRule.mutate(id)}
                      isDeleting={deleteRule.isPending}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
