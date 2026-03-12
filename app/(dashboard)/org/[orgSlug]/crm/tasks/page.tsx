'use client';

import { useState } from 'react';
import { formatDate, formatTime, formatShortDate } from '@/lib/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ListTodo, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMyTasks, useCompleteTask } from '@/hooks/useCRM';
import type { Activity } from '@/hooks/useCRM';

type Filter = 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';

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
    return formatTime(due, { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return formatDate(due, { weekday: 'short' });
  return formatShortDate(due);
}

const urgencyBadge: Record<string, string> = {
  overdue: 'bg-red-50 text-red-700 border-red-200',
  today: 'bg-amber-50 text-amber-700 border-amber-200',
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  none: 'bg-gray-50 text-gray-700 border-gray-200',
};

function TaskItem({ task, onComplete }: { task: Activity; onComplete: (id: string) => void }) {
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
          {task.lead_id && (
            <Badge variant="secondary" className="text-xs">
              Lead
            </Badge>
          )}
          {task.opportunity_id && (
            <Badge variant="secondary" className="text-xs">
              Opportunity
            </Badge>
          )}
          {task.account_id && (
            <Badge variant="secondary" className="text-xs">
              Account
            </Badge>
          )}
          {task.contact_id && (
            <Badge variant="secondary" className="text-xs">
              Contact
            </Badge>
          )}
        </div>
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

export default function CRMTasksPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [entityType, setEntityType] = useState<string>('all');

  const { data, isLoading } = useMyTasks({
    filter,
    entityType:
      entityType === 'all'
        ? undefined
        : (entityType as 'lead' | 'opportunity' | 'account' | 'contact'),
    limit: 50,
  });

  const completeTask = useCompleteTask();

  const tasks = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <title>My Tasks — KrewPact CRM</title>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Tasks</h1>
            <p className="text-sm text-muted-foreground">
              {total} task{total !== 1 ? 's' : ''} {filter !== 'all' ? `(${filter})` : ''}
            </p>
          </div>

          <div className="flex gap-2">
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="opportunity">Opportunities</SelectItem>
                <SelectItem value="account">Accounts</SelectItem>
                <SelectItem value="contact">Contacts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <Button
                key={opt.value}
                variant={filter === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(opt.value)}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </Button>
            );
          })}
        </div>

        {/* Task list */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="sr-only">Task list</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="font-medium">No tasks</p>
                <p className="text-sm mt-1">
                  {filter === 'overdue'
                    ? "You're all caught up!"
                    : filter === 'completed'
                      ? 'No completed tasks'
                      : 'No upcoming tasks'}
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={(id) => completeTask.mutate({ id })}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
