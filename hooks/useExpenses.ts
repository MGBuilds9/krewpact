'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  status: string;
  expense_date: string;
  receipt_url: string | null;
  currency: string;
  project_id: string | null;
  division_id: string | null;
  created_at: string;
  user: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
  project: { name: string } | null;
}

export interface ExpenseCreate {
  amount: number;
  category: string;
  description?: string;
  project_id?: string;
  division_id?: string;
  expense_date: string;
  receipt_url?: string;
  currency?: string;
}

export function useExpenses(options?: { status?: string; projectId?: string }) {
  return useQuery({
    queryKey: ['expenses', options?.status, options?.projectId],
    queryFn: () =>
      apiFetch<Expense[]>('/api/expenses', {
        params: {
          status: options?.status,
          project_id: options?.projectId,
        },
      }),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExpenseCreate) =>
      apiFetch<Expense>('/api/expenses', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Expense> & { id: string }) =>
      apiFetch<Expense>(`/api/expenses/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
