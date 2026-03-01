'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface SelectionSheet {
  id: string;
  project_id: string;
  sheet_name: string;
  status: 'draft' | 'issued' | 'client_review' | 'approved' | 'locked';
  created_at: string;
  updated_at: string;
}

export interface SelectionOption {
  id: string;
  selection_sheet_id: string;
  option_group: string;
  option_name: string;
  allowance_amount: number | null;
  upgrade_amount: number | null;
  sort_order: number | null;
  created_at: string;
}

export interface SelectionChoice {
  id: string;
  selection_sheet_id: string;
  selection_option_id: string;
  quantity: number | null;
  notes: string | null;
  chosen_by: string | null;
  chosen_at: string | null;
  created_at: string;
}

export interface AllowanceReconciliation {
  id: string;
  project_id: string;
  category_name: string;
  allowance_budget: number;
  selected_cost: number;
  variance: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export function useSelectionSheets(projectId: string) {
  return useQuery({
    queryKey: ['selection-sheets', projectId],
    queryFn: () => apiFetch<PaginatedResponse<SelectionSheet>>(`/api/projects/${projectId}/selections`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useSelectionSheet(projectId: string, sheetId: string) {
  return useQuery({
    queryKey: ['selection-sheet', projectId, sheetId],
    queryFn: () => apiFetch<SelectionSheet>(`/api/projects/${projectId}/selections/${sheetId}`),
    enabled: !!projectId && !!sheetId,
    staleTime: 30_000,
  });
}

export function useCreateSelectionSheet(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<SelectionSheet>(`/api/projects/${projectId}/selections`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selection-sheets', projectId] });
    },
  });
}

export function useUpdateSelectionSheet(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sheetId, ...data }: { sheetId: string } & Record<string, unknown>) =>
      apiFetch<SelectionSheet>(`/api/projects/${projectId}/selections/${sheetId}`, { method: 'PATCH', body: data }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['selection-sheets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['selection-sheet', projectId, vars.sheetId] });
    },
  });
}

export function useSelectionOptions(projectId: string, sheetId: string) {
  return useQuery({
    queryKey: ['selection-options', projectId, sheetId],
    queryFn: () => apiFetch<SelectionOption[]>(`/api/projects/${projectId}/selections/${sheetId}/options`),
    enabled: !!projectId && !!sheetId,
    staleTime: 30_000,
  });
}

export function useAddSelectionOption(projectId: string, sheetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<SelectionOption>(`/api/projects/${projectId}/selections/${sheetId}/options`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selection-options', projectId, sheetId] });
    },
  });
}

export function useSelectionChoices(projectId: string, sheetId: string) {
  return useQuery({
    queryKey: ['selection-choices', projectId, sheetId],
    queryFn: () => apiFetch<SelectionChoice[]>(`/api/projects/${projectId}/selections/${sheetId}/choices`),
    enabled: !!projectId && !!sheetId,
    staleTime: 30_000,
  });
}

export function useSubmitSelectionChoice(projectId: string, sheetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<SelectionChoice>(`/api/projects/${projectId}/selections/${sheetId}/choices`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selection-choices', projectId, sheetId] });
    },
  });
}

export function useAllowances(projectId: string) {
  return useQuery({
    queryKey: ['allowances', projectId],
    queryFn: () => apiFetch<PaginatedResponse<AllowanceReconciliation>>(`/api/projects/${projectId}/allowances`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateAllowance(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<AllowanceReconciliation>(`/api/projects/${projectId}/allowances`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowances', projectId] });
    },
  });
}
