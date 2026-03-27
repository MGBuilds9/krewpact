'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

export type { ScoringRule };

const CATEGORY_COLORS: Record<string, string> = {
  fit: 'bg-blue-100 text-blue-700 border-blue-200',
  intent: 'bg-purple-100 text-purple-700 border-purple-200',
  engagement: 'bg-green-100 text-green-700 border-green-200',
};

interface RuleRowProps {
  rule: ScoringRule;
  onEdit: (r: ScoringRule) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function RuleRow({ rule, onEdit, onDelete, isDeleting }: RuleRowProps) {
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
