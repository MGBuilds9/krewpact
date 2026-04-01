'use client';

import { CheckCircle2 } from 'lucide-react';

import type { Activity } from '@/hooks/useCRM';

import type { Filter } from './TaskFilterBar';
import { TaskItem } from './TaskItem';

const EMPTY_MESSAGES: Record<string, string> = {
  overdue: "You're all caught up!",
  completed: 'No completed tasks',
};

export function TaskListContent({
  tasks,
  isLoading,
  filter,
  onComplete,
  onDisposition,
  onNavigate,
}: {
  tasks: Activity[];
  isLoading: boolean;
  filter: Filter;
  onComplete: (id: string) => void;
  onDisposition: () => void;
  onNavigate: (path: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="font-medium">No tasks</p>
        <p className="text-sm mt-1">{EMPTY_MESSAGES[filter] ?? 'No upcoming tasks'}</p>
      </div>
    );
  }
  return (
    <>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onComplete={onComplete}
          onDisposition={onDisposition}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}
