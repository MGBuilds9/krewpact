'use client';

import { AlertTriangle } from 'lucide-react';

import TaskDispositionButtons from '@/components/CRM/TaskDispositionButtons';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { Activity } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';

function getTaskUrgency(dueAt: string | null): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!dueAt) return 'none';
  const now = new Date();
  const due = new Date(dueAt);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (due < now) return 'overdue';
  if (due <= todayEnd) return 'today';
  return 'upcoming';
}

function formatDueDate(dueAt: string): string {
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) {
    return due.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return due.toLocaleDateString('en-CA', { weekday: 'short' });
  return due.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

const urgencyBadge: Record<string, string> = {
  overdue: 'bg-red-50 text-red-700 border-red-200',
  today: 'bg-amber-50 text-amber-700 border-amber-200',
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  none: 'bg-gray-50 text-gray-700 border-gray-200',
};

function EntityBadge({
  id,
  label,
  path,
  onNavigate,
}: {
  id: string | null;
  label: string;
  path: string;
  onNavigate: (path: string) => void;
}) {
  if (!id) return null;
  return (
    <Badge
      variant="secondary"
      className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(`${path}/${id}`);
      }}
    >
      {label}
    </Badge>
  );
}

export function TaskItem({
  task,
  onComplete,
  onDisposition,
  onNavigate,
}: {
  task: Activity;
  onComplete: (id: string) => void;
  onDisposition: () => void;
  onNavigate: (path: string) => void;
}) {
  const urgency = getTaskUrgency(task.due_at);

  return (
    <div className="flex items-start gap-4 py-3 px-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
      <Checkbox
        className="mt-1"
        onCheckedChange={() => onComplete(task.id)}
        aria-label={`Complete task: ${task.title}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{task.title}</p>
        {task.details && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {String(task.details)}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {task.activity_type}
          </Badge>
          <EntityBadge id={task.lead_id} label="Lead" path="/crm/leads" onNavigate={onNavigate} />
          <EntityBadge
            id={task.opportunity_id}
            label="Opportunity"
            path="/crm/opportunities"
            onNavigate={onNavigate}
          />
          <EntityBadge
            id={task.account_id}
            label="Account"
            path="/crm/accounts"
            onNavigate={onNavigate}
          />
          <EntityBadge
            id={task.contact_id}
            label="Contact"
            path="/crm/contacts"
            onNavigate={onNavigate}
          />
        </div>
        {task.lead_id && (
          <TaskDispositionButtons activityId={task.id} onDisposition={onDisposition} />
        )}
      </div>
      {task.due_at && (
        <Badge variant="outline" className={cn('text-xs shrink-0', urgencyBadge[urgency])}>
          {urgency === 'overdue' && <AlertTriangle className="h-3 w-3 mr-1 inline" />}
          {formatDueDate(task.due_at)}
        </Badge>
      )}
    </div>
  );
}
