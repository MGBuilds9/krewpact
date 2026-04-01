'use client';

import { AlertTriangle, CheckCircle2, Clock, ListTodo } from 'lucide-react';

import { Button } from '@/components/ui/button';

export type Filter = 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';

const FILTER_OPTIONS: {
  value: Filter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'all', label: 'Active', icon: ListTodo },
  { value: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { value: 'today', label: 'Today', icon: Clock },
  { value: 'upcoming', label: 'Upcoming', icon: Clock },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export function TaskFilterBar({
  filter,
  onFilterChange,
}: {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {FILTER_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <Button
            key={opt.value}
            variant={filter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(opt.value)}
            className="gap-1.5"
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
