'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'todo' | 'in_progress' | 'done' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  project_id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  due_date?: string | null;
}

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () =>
      apiFetch<Task[]>('/api/tasks', {
        params: projectId ? { project_id: projectId } : undefined,
      }),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => apiFetch<Task>(`/api/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: TaskCreate) =>
      apiFetch<Task>('/api/tasks', {
        method: 'POST',
        body: task,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TaskUpdate }) =>
      apiFetch<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
