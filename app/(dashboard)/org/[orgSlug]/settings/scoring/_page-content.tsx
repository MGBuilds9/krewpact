'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Sliders } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';

import { RuleForm, type RuleFormState } from './_components/RuleForm';
import { RuleRow, type ScoringRule } from './_components/RuleRow';

const EMPTY_FORM: RuleFormState = {
  name: '',
  category: 'fit',
  field_name: '',
  operator: 'equals',
  value: '',
  score_impact: '0',
  is_active: true,
};

function useScoringRules() {
  return useQuery({
    queryKey: ['scoring-rules'],
    queryFn: () => apiFetch<ScoringRule[]>('/api/crm/scoring-rules'),
  });
}

// eslint-disable-next-line max-lines-per-function
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
