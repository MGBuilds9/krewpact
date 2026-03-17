'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ScoringRuleRow {
  id: string;
  name: string;
  field_name: string;
  operator: string;
  value: string;
  score_impact: number;
  category: string;
  is_active: boolean;
}

interface ScoringRulesTableProps {
  rules: ScoringRuleRow[];
  onToggleActive?: (id: string, isActive: boolean) => void;
  onEdit?: (rule: ScoringRuleRow) => void;
  onDelete?: (id: string) => void;
}

const OPERATOR_LABELS: Record<string, string> = {
  equals: 'Equals',
  not_equals: 'Not Equals',
  contains: 'Contains',
  not_contains: 'Not Contains',
  greater_than: 'Greater Than',
  less_than: 'Less Than',
  greater_than_or_equal: 'Greater Than or Equal',
  less_than_or_equal: 'Less Than or Equal',
  exists: 'Exists',
  not_exists: 'Not Exists',
  starts_with: 'Starts With',
  ends_with: 'Ends With',
};

function getCategoryBadgeVariant(category: string): 'default' | 'secondary' | 'outline' {
  switch (category) {
    case 'fit':
      return 'default';
    case 'intent':
      return 'secondary';
    case 'engagement':
      return 'outline';
    default:
      return 'outline';
  }
}

interface RuleRowProps {
  rule: ScoringRuleRow;
  onToggleActive?: (id: string, isActive: boolean) => void;
  onEdit?: (rule: ScoringRuleRow) => void;
  onDelete?: (id: string) => void;
}
function RuleRow({ rule, onToggleActive, onEdit, onDelete }: RuleRowProps) {
  return (
    <TableRow key={rule.id}>
      <TableCell className="font-medium">{rule.name}</TableCell>
      <TableCell>{rule.field_name}</TableCell>
      <TableCell>{OPERATOR_LABELS[rule.operator] ?? rule.operator}</TableCell>
      <TableCell>
        {rule.operator === 'exists' || rule.operator === 'not_exists' ? '-' : rule.value}
      </TableCell>
      <TableCell className="text-right">
        <span className={rule.score_impact >= 0 ? 'text-green-600' : 'text-red-600'}>
          {rule.score_impact > 0 ? '+' : ''}
          {rule.score_impact}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant={getCategoryBadgeVariant(rule.category)}>{rule.category}</Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={rule.is_active}
          onCheckedChange={(checked) => onToggleActive?.(rule.id, checked)}
          aria-label={`Toggle ${rule.name}`}
        />
      </TableCell>
      {(onEdit || onDelete) && (
        <TableCell>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => onDelete(rule.id)}
              >
                Delete
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export function ScoringRulesTable({
  rules,
  onToggleActive,
  onEdit,
  onDelete,
}: ScoringRulesTableProps) {
  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scoring rules configured. Add a rule to start scoring leads.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Operator</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Active</TableHead>
            {(onEdit || onDelete) && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
