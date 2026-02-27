'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface RFQPackage {
  id: string;
  project_id: string;
  rfq_number: string;
  title: string;
  scope_summary: string | null;
  due_at: string | null;
  status: 'draft' | 'issued' | 'closed' | 'awarded' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RFQInvite {
  id: string;
  rfq_id: string;
  portal_account_id: string | null;
  invited_email: string | null;
  invited_at: string;
  status: string;
}

export interface RFQBid {
  id: string;
  rfq_id: string;
  invite_id: string | null;
  submitted_by_portal_id: string | null;
  submitted_at: string | null;
  currency_code: string | null;
  subtotal_amount: number;
  tax_amount: number | null;
  total_amount: number;
  exclusions: string | null;
  status: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BidLevelingSession {
  id: string;
  rfq_id: string;
  version_no: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BidLevelingEntry {
  id: string;
  leveling_session_id: string;
  bid_id: string;
  normalized_total: number;
  risk_score: number | null;
  recommended: boolean | null;
  rationale: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceDoc {
  id: string;
  portal_account_id: string;
  compliance_type: string;
  file_id: string | null;
  doc_number: string | null;
  issued_on: string | null;
  expires_on: string | null;
  status: 'valid' | 'expiring' | 'expired' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostCode {
  id: string;
  division_id: string;
  cost_code: string;
  cost_code_name: string;
  parent_cost_code_id: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CostCodeMapping {
  id: string;
  division_id: string;
  local_cost_code: string;
  erp_cost_code: string;
  adp_labor_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ListResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================
// RFQ packages
// ============================================================

export function useRFQPackages(projectId: string) {
  return useQuery({
    queryKey: ['rfqs', projectId],
    queryFn: () => apiFetch<ListResponse<RFQPackage>>(`/api/projects/${projectId}/rfqs`),
    staleTime: 30_000,
    enabled: !!projectId,
  });
}

export function useRFQPackage(projectId: string, rfqId: string) {
  return useQuery({
    queryKey: ['rfq', projectId, rfqId],
    queryFn: () => apiFetch<RFQPackage>(`/api/projects/${projectId}/rfqs/${rfqId}`),
    staleTime: 30_000,
    enabled: !!projectId && !!rfqId,
  });
}

export function useCreateRFQPackage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RFQPackage>) =>
      apiFetch<RFQPackage>(`/api/projects/${projectId}/rfqs`, { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rfqs', projectId] }),
  });
}

export function useUpdateRFQPackage(projectId: string, rfqId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RFQPackage>) =>
      apiFetch<RFQPackage>(`/api/projects/${projectId}/rfqs/${rfqId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['rfq', projectId, rfqId] });
    },
  });
}

// ============================================================
// RFQ invites
// ============================================================

export function useRFQInvites(projectId: string, rfqId: string) {
  return useQuery({
    queryKey: ['rfq-invites', projectId, rfqId],
    queryFn: () =>
      apiFetch<ListResponse<RFQInvite>>(`/api/projects/${projectId}/rfqs/${rfqId}/invites`),
    staleTime: 30_000,
    enabled: !!projectId && !!rfqId,
  });
}

export function useCreateRFQInvite(projectId: string, rfqId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RFQInvite>) =>
      apiFetch<RFQInvite>(`/api/projects/${projectId}/rfqs/${rfqId}/invites`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['rfq-invites', projectId, rfqId] }),
  });
}

// ============================================================
// RFQ bids
// ============================================================

export function useRFQBids(projectId: string, rfqId: string) {
  return useQuery({
    queryKey: ['rfq-bids', projectId, rfqId],
    queryFn: () =>
      apiFetch<ListResponse<RFQBid>>(`/api/projects/${projectId}/rfqs/${rfqId}/bids`),
    staleTime: 30_000,
    enabled: !!projectId && !!rfqId,
  });
}

export function useSubmitRFQBid(projectId: string, rfqId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RFQBid>) =>
      apiFetch<RFQBid>(`/api/projects/${projectId}/rfqs/${rfqId}/bids`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rfq-bids', projectId, rfqId] }),
  });
}

// ============================================================
// Bid leveling
// ============================================================

export function useBidLevelingSessions(projectId: string, rfqId: string) {
  return useQuery({
    queryKey: ['bid-leveling', projectId, rfqId],
    queryFn: () =>
      apiFetch<ListResponse<BidLevelingSession>>(
        `/api/projects/${projectId}/rfqs/${rfqId}/leveling`,
      ),
    staleTime: 30_000,
    enabled: !!projectId && !!rfqId,
  });
}

export function useCreateBidLevelingSession(projectId: string, rfqId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { notes?: string; entries: Partial<BidLevelingEntry>[] }) =>
      apiFetch<BidLevelingSession>(`/api/projects/${projectId}/rfqs/${rfqId}/leveling`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['bid-leveling', projectId, rfqId] }),
  });
}

// ============================================================
// Compliance docs
// ============================================================

export function useComplianceDocs(portalAccountId?: string) {
  return useQuery({
    queryKey: ['compliance-docs', portalAccountId],
    queryFn: () =>
      apiFetch<ListResponse<ComplianceDoc>>('/api/compliance', {
        params: { portal_account_id: portalAccountId },
      }),
    staleTime: 30_000,
  });
}

export function useCreateComplianceDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComplianceDoc>) =>
      apiFetch<ComplianceDoc>('/api/compliance', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compliance-docs'] }),
  });
}

export function useUpdateComplianceDoc(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComplianceDoc>) =>
      apiFetch<ComplianceDoc>(`/api/compliance/${docId}`, { method: 'PATCH', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compliance-docs'] }),
  });
}

// ============================================================
// Cost codes
// ============================================================

export function useCostCodes(divisionId?: string) {
  return useQuery({
    queryKey: ['cost-codes', divisionId],
    queryFn: () =>
      apiFetch<ListResponse<CostCode>>('/api/cost-codes', {
        params: { division_id: divisionId },
      }),
    staleTime: 30_000,
  });
}

export function useCreateCostCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CostCode>) =>
      apiFetch<CostCode>('/api/cost-codes', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cost-codes'] }),
  });
}

export function useUpdateCostCode(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CostCode>) =>
      apiFetch<CostCode>(`/api/cost-codes/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cost-codes'] }),
  });
}

export function useCostCodeMappings(codeId: string) {
  return useQuery({
    queryKey: ['cost-code-mappings', codeId],
    queryFn: () => apiFetch<ListResponse<CostCodeMapping>>(`/api/cost-codes/${codeId}/mappings`),
    staleTime: 30_000,
    enabled: !!codeId,
  });
}

export function useCreateCostCodeMapping(codeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CostCodeMapping>) =>
      apiFetch<CostCodeMapping>(`/api/cost-codes/${codeId}/mappings`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cost-code-mappings', codeId] }),
  });
}
