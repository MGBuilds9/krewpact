'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  project_id: string;
  task_id: string | null;
  user_id: string;
  work_date: string;
  hours_regular: number;
  hours_overtime: number | null;
  cost_code: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimesheetBatch {
  id: string;
  division_id: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'exported';
  submitted_by: string | null;
  approved_by: string | null;
  exported_at: string | null;
  adp_export_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseReceipt {
  id: string;
  expense_id: string;
  file_id: string;
  ocr_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ExpenseApproval {
  id: string;
  expense_id: string;
  decision: string;
  reviewer_user_id: string;
  reviewer_notes: string | null;
  created_at: string;
}

// ─── Time Entries ──────────────────────────────────────────────────────────────

export function useTimeEntries(projectId: string) {
  return useQuery({
    queryKey: ['time-entries', projectId],
    queryFn: () =>
      apiFetch<{ data: TimeEntry[]; total: number; hasMore: boolean }>(
        `/api/projects/${projectId}/time-entries`,
      ),
    staleTime: 30_000,
  });
}

export function useCreateTimeEntry(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<TimeEntry>(`/api/projects/${projectId}/time-entries`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries', projectId] }),
  });
}

export function useUpdateTimeEntry(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch<TimeEntry>(`/api/projects/${projectId}/time-entries/${id}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries', projectId] }),
  });
}

export function useDeleteTimeEntry(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/projects/${projectId}/time-entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries', projectId] }),
  });
}

// ─── Timesheet Batches ─────────────────────────────────────────────────────────

export function useTimesheetBatches(params?: { status?: string; divisionId?: string }) {
  return useQuery({
    queryKey: ['timesheet-batches', params?.status, params?.divisionId],
    queryFn: () =>
      apiFetch<{ data: TimesheetBatch[]; total: number; hasMore: boolean }>(
        '/api/timesheet-batches',
        {
          params: { status: params?.status, division_id: params?.divisionId },
        },
      ),
    staleTime: 30_000,
  });
}

export function useTimesheetBatch(batchId: string) {
  return useQuery({
    queryKey: ['timesheet-batch', batchId],
    queryFn: () => apiFetch<TimesheetBatch>(`/api/timesheet-batches/${batchId}`),
    staleTime: 30_000,
  });
}

export function useCreateTimesheetBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<TimesheetBatch>('/api/timesheet-batches', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-batches'] }),
  });
}

export function useApproveTimesheetBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch<TimesheetBatch>(`/api/timesheet-batches/${id}/approve`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-batches'] }),
  });
}

// ─── Expense Receipts ──────────────────────────────────────────────────────────

export function useExpenseReceipts(expenseId: string) {
  return useQuery({
    queryKey: ['expense-receipts', expenseId],
    queryFn: () =>
      apiFetch<{ data: ExpenseReceipt[]; total: number; hasMore: boolean }>(
        `/api/expenses/${expenseId}/receipts`,
      ),
    staleTime: 30_000,
  });
}

export function useCreateExpenseReceipt(expenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<ExpenseReceipt>(`/api/expenses/${expenseId}/receipts`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-receipts', expenseId] }),
  });
}

export function useDeleteExpenseReceipt(expenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiptId: string) =>
      apiFetch(`/api/expenses/${expenseId}/receipts/${receiptId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-receipts', expenseId] }),
  });
}

// ─── Expense Approvals ─────────────────────────────────────────────────────────

export function useApproveExpense(expenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<ExpenseApproval>(`/api/expenses/${expenseId}/approve`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-receipts', expenseId] });
    },
  });
}
