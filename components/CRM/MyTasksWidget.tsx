'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ListTodo, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { useMyTasks, useCompleteTask } from '@/hooks/useCRM';
import { formatShortDate } from '@/lib/date';
import type { Activity } from '@/hooks/useCRM';
import Link from 'next/link';

interface MyTasksWidgetProps {
  orgSlug: string;
}

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
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return formatShortDate(due);
}

const urgencyStyles = {
  overdue: 'text-red-600 bg-red-50',
  today: 'text-amber-600 bg-amber-50',
  upcoming: 'text-blue-600 bg-blue-50',
  none: 'text-muted-foreground',
};

function TaskRow({ task, onComplete }: { task: Activity; onComplete: (id: string) => void }) {
  const urgency = getTaskUrgency(task.due_at);

  return (
    <div className="flex items-start gap-3 py-2 px-1 rounded hover:bg-muted/50 transition-colors">
      <Checkbox
        className="mt-0.5"
        onCheckedChange={() => onComplete(task.id)}
        aria-label={`Complete task: ${task.title}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.due_at && (
          <span className={cn('text-xs px-1.5 py-0.5 rounded', urgencyStyles[urgency])}>
            {urgency === 'overdue' && <AlertTriangle className="inline h-3 w-3 mr-1" />}
            {urgency === 'today' && <Clock className="inline h-3 w-3 mr-1" />}
            {formatDueDate(task.due_at)}
          </span>
        )}
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {task.activity_type}
      </Badge>
    </div>
  );
}

export function MyTasksWidget({ orgSlug }: MyTasksWidgetProps) {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today'>('all');
  const { data, isLoading } = useMyTasks({ filter, limit: 10 });
  const completeTask = useCompleteTask();

  const tasks = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            My Tasks
            {total > 0 && (
              <Badge variant="secondary" className="text-xs">
                {total}
              </Badge>
            )}
          </CardTitle>
          <Link href={`/org/${orgSlug}/crm/tasks`}>
            <Button variant="ghost" size="sm" className="text-xs">
              View all <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="flex gap-1 mt-2">
          {(['all', 'overdue', 'today'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'overdue' ? 'Overdue' : 'Today'}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <ListTodo className="mx-auto h-6 w-6 mb-2 opacity-50" />
            No tasks {filter !== 'all' ? `${filter}` : ''}
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onComplete={(id) => completeTask.mutate({ id })} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
