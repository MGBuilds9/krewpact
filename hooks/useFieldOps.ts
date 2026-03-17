'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

// ============================================================
// Interfaces
// ============================================================

export interface RFIItem {
  id: string;
  project_id: string;
  rfi_number: string;
  title: string;
  question_text: string;
  status: 'open' | 'responded' | 'closed' | 'void';
  due_at: string | null;
  requester_user_id: string | null;
  responder_user_id: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RFIThread {
  id: string;
  rfi_id: string;
  author_user_id: string | null;
  message_text: string;
  is_official_response: boolean;
  created_at: string;
}

export interface Submittal {
  id: string;
  project_id: string;
  submittal_number: string;
  title: string;
  status:
    | 'draft'
    | 'submitted'
    | 'revise_and_resubmit'
    | 'approved'
    | 'approved_as_noted'
    | 'rejected';
  due_at: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmittalReview {
  id: string;
  submittal_id: string;
  reviewer_user_id: string | null;
  outcome: string;
  review_notes: string | null;
  reviewed_at: string | null;
}

export type { ChangeOrder, ChangeRequest } from './useChangeManagement';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================
// RFIs
// ============================================================

export function useRFIs(projectId: string) {
  return useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => apiFetch<PaginatedResponse<RFIItem>>(`/api/projects/${projectId}/rfis`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useRFI(projectId: string, rfiId: string) {
  return useQuery({
    queryKey: ['rfi', projectId, rfiId],
    queryFn: () => apiFetch<RFIItem>(`/api/projects/${projectId}/rfis/${rfiId}`),
    enabled: !!projectId && !!rfiId,
    staleTime: 30_000,
  });
}

export function useCreateRFI(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RFIItem>) =>
      apiFetch<RFIItem>(`/api/projects/${projectId}/rfis`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis', projectId] });
    },
  });
}

export function useUpdateRFI(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rfiId, ...data }: Partial<RFIItem> & { rfiId: string }) =>
      apiFetch<RFIItem>(`/api/projects/${projectId}/rfis/${rfiId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfis', projectId] });
      queryClient.invalidateQueries({ queryKey: ['rfi', projectId, variables.rfiId] });
    },
  });
}

// ============================================================
// RFI Threads
// ============================================================

export function useRFIThreads(projectId: string, rfiId: string) {
  return useQuery({
    queryKey: ['rfi-threads', projectId, rfiId],
    queryFn: () =>
      apiFetch<PaginatedResponse<RFIThread>>(`/api/projects/${projectId}/rfis/${rfiId}/threads`),
    enabled: !!projectId && !!rfiId,
    staleTime: 30_000,
  });
}

export function useCreateRFIThread(projectId: string, rfiId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RFIThread>) =>
      apiFetch<RFIThread>(`/api/projects/${projectId}/rfis/${rfiId}/threads`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfi-threads', projectId, rfiId] });
    },
  });
}

// ============================================================
// Submittals
// ============================================================

export function useSubmittals(projectId: string) {
  return useQuery({
    queryKey: ['submittals', projectId],
    queryFn: () => apiFetch<PaginatedResponse<Submittal>>(`/api/projects/${projectId}/submittals`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useSubmittal(projectId: string, subId: string) {
  return useQuery({
    queryKey: ['submittal', projectId, subId],
    queryFn: () => apiFetch<Submittal>(`/api/projects/${projectId}/submittals/${subId}`),
    enabled: !!projectId && !!subId,
    staleTime: 30_000,
  });
}

export function useCreateSubmittal(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Submittal>) =>
      apiFetch<Submittal>(`/api/projects/${projectId}/submittals`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals', projectId] });
    },
  });
}

export function useUpdateSubmittal(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subId, ...data }: Partial<Submittal> & { subId: string }) =>
      apiFetch<Submittal>(`/api/projects/${projectId}/submittals/${subId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submittals', projectId] });
      queryClient.invalidateQueries({ queryKey: ['submittal', projectId, variables.subId] });
    },
  });
}

// ============================================================
// Submittal Reviews
// ============================================================

export function useSubmittalReviews(projectId: string, subId: string) {
  return useQuery({
    queryKey: ['submittal-reviews', projectId, subId],
    queryFn: () =>
      apiFetch<PaginatedResponse<SubmittalReview>>(
        `/api/projects/${projectId}/submittals/${subId}/reviews`,
      ),
    enabled: !!projectId && !!subId,
    staleTime: 30_000,
  });
}

export function useCreateSubmittalReview(projectId: string, subId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SubmittalReview>) =>
      apiFetch<SubmittalReview>(`/api/projects/${projectId}/submittals/${subId}/reviews`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittal-reviews', projectId, subId] });
      queryClient.invalidateQueries({ queryKey: ['submittals', projectId] });
    },
  });
}

// Change management hooks moved to useChangeManagement.ts to stay under line limit
export {
  useChangeOrder,
  useChangeOrders,
  useChangeRequest,
  useChangeRequests,
  useCreateChangeOrder,
  useCreateChangeRequest,
  useUpdateChangeOrder,
  useUpdateChangeRequest,
} from './useChangeManagement';
