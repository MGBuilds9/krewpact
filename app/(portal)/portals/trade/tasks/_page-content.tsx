'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_at: string | null;
  blocked_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  data: Task[];
  total: number;
}

const PRIORITY_MAP: Record<Task['priority'], { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
};

const STATUS_LABELS: Record<Task['status'], string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [Task['status'], string][];

function TaskCard({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (id: string, status: Task['status']) => void;
}) {
  const { label: priorityLabel, className: priorityClass } =
    PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.medium;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-gray-900">{task.title}</p>
        <Badge className={`text-xs border shrink-0 ${priorityClass}`}>{priorityLabel}</Badge>
      </div>
      {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}
      {task.blocked_reason && (
        <p className="text-xs text-red-600 font-medium">Blocked: {task.blocked_reason}</p>
      )}
      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        {task.due_at ? (
          <p className="text-xs text-gray-500">
            Due: {new Date(task.due_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
          </p>
        ) : (
          <span />
        )}
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
          className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
          aria-label={`Update status for ${task.title}`}
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function TradeTasksPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ['portal-trade-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/portal/trade/tasks');
      if (!res.ok) throw new Error('Failed to load tasks');
      return res.json() as Promise<ApiResponse>;
    },
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Task['status'] }) => {
      const res = await fetch(`/api/portal/trade/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal-trade-tasks'] });
    },
  });

  const tasks = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Tasks</h2>
          <p className="text-sm text-gray-500 mt-0.5">Assigned tasks across your active projects</p>
        </div>
        {!isLoading && (
          <span className="text-sm text-gray-500">
            {total} task{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isError && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3"
          role="alert"
        >
          <p className="text-sm text-red-700">Failed to load tasks.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <TasksSkeleton />
      ) : tasks.length === 0 && !isError ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-3">
          <CheckSquare className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm">No tasks assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={(id, status) => updateStatus({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
