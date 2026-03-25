'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { TimesheetBatch } from '@/hooks/useTimeExpense';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PayrollPeriod {
  start: string;
  end: string;
  label: string;
}

export interface BatchApprovalPayload {
  id: string;
  status: 'approved' | 'rejected';
  reason?: string;
}

// ─── Pay Period Helpers ────────────────────────────────────────────────────────

/**
 * Generates bi-weekly pay period options from the last 6 months.
 */
export function generatePayPeriods(count = 12): PayrollPeriod[] {
  const periods: PayrollPeriod[] = [];
  const now = new Date();

  // Align to nearest bi-weekly boundary (every 2 weeks from a fixed anchor)
  const anchor = new Date('2026-01-05'); // Monday anchor
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysDiff = Math.floor((now.getTime() - anchor.getTime()) / msPerDay);
  const periodIndex = Math.floor(daysDiff / 14);

  for (let i = periodIndex; i > periodIndex - count; i--) {
    const start = new Date(anchor.getTime() + i * 14 * msPerDay);
    const end = new Date(start.getTime() + 13 * msPerDay);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const label = `${fmt(start)} – ${fmt(end)}`;

    periods.push({ start: fmt(start), end: fmt(end), label });
  }

  return periods;
}

// ─── Batch Hooks ───────────────────────────────────────────────────────────────

export function useTimesheetBatchList(params?: { status?: string; divisionId?: string }) {
  return useQuery({
    queryKey: ['payroll-batches', params?.status, params?.divisionId],
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

export function useCreatePayrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      division_id: string;
      period_start: string;
      period_end: string;
    }) => apiFetch<TimesheetBatch>('/api/timesheet-batches', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-batches'] }),
  });
}

export function useApproveBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: BatchApprovalPayload) =>
      apiFetch<TimesheetBatch>(`/api/timesheet-batches/${id}/approve`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-batches'] });
      qc.invalidateQueries({ queryKey: ['timesheet-batches'] });
    },
  });
}

export function useExportBatchToADP() {
  return useMutation({
    mutationFn: async (batchId: string): Promise<{ csv: string; filename: string }> => {
      const response = await fetch(`/api/timesheet-batches/${batchId}/export`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Export failed: ${response.status}`);
      }

      const csv = await response.text();
      const filename = `adp-export-${batchId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      return { csv, filename };
    },
  });
}

// ─── Receipt Upload Hook ───────────────────────────────────────────────────────

export interface ReceiptUploadResult {
  file_id: string;
  url: string;
}

export function useUploadReceipt(expenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ReceiptUploadResult> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/expenses/${expenseId}/receipts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Upload failed: ${response.status}`);
      }

      return response.json() as Promise<ReceiptUploadResult>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-receipts', expenseId] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
