'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { PaginatedResponse } from './useEstimating';

// --- Types ---

export interface Proposal {
  id: string;
  estimate_id: string;
  proposal_number: string;
  status: string;
  proposal_payload: Record<string, unknown>;
  expires_on: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalEvent {
  id: string;
  proposal_id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  occurred_at: string;
  actor_user_id: string | null;
}

export interface ContractTerms {
  id: string;
  proposal_id: string;
  contract_status: string;
  legal_text_version: string;
  terms_payload: Record<string, unknown>;
  signed_at: string | null;
  supersedes_contract_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ESignEnvelope {
  id: string;
  provider: string;
  provider_envelope_id: string;
  contract_id: string;
  status: string;
  signer_count: number;
  webhook_last_event_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ESignDocument {
  id: string;
  envelope_id: string;
  file_id: string;
  certificate_file_id: string | null;
  checksum_sha256: string | null;
  signed_at: string | null;
  created_at: string;
}

// --- Filter interfaces ---

interface ProposalFilters {
  estimateId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface ContractTermsFilters {
  proposalId?: string;
  contractStatus?: string;
  limit?: number;
  offset?: number;
}

// --- Proposals ---

export function useProposals(filters?: ProposalFilters) {
  return useQuery({
    queryKey: ['proposals', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<Proposal>>('/api/proposals', {
        params: {
          estimate_id: filters?.estimateId,
          status: filters?.status,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: ['proposal', id],
    queryFn: () => apiFetch<Proposal>(`/api/proposals/${id}`),
    enabled: !!id,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Proposal>) =>
      apiFetch<Proposal>('/api/proposals', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Proposal> & { id: string }) =>
      apiFetch<Proposal>(`/api/proposals/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', variables.id] });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/proposals/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

// --- Proposal Events ---

export function useProposalEvents(proposalId: string) {
  return useQuery({
    queryKey: ['proposal-events', proposalId],
    queryFn: () => apiFetch<ProposalEvent[]>(`/api/proposals/${proposalId}/events`),
    enabled: !!proposalId,
  });
}

export function useCreateProposalEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, ...data }: Partial<ProposalEvent> & { proposalId: string }) =>
      apiFetch<ProposalEvent>(`/api/proposals/${proposalId}/events`, { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-events', variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', variables.proposalId] });
    },
  });
}

// --- Contract Terms ---

export function useContractTerms(filters?: ContractTermsFilters) {
  return useQuery({
    queryKey: ['contract-terms', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<ContractTerms>>('/api/contracts', {
        params: {
          proposal_id: filters?.proposalId,
          contract_status: filters?.contractStatus,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useContractTerm(id: string) {
  return useQuery({
    queryKey: ['contract-term', id],
    queryFn: () => apiFetch<ContractTerms>(`/api/contracts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContractTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContractTerms>) =>
      apiFetch<ContractTerms>('/api/contracts', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-terms'] });
    },
  });
}

export function useUpdateContractTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ContractTerms> & { id: string }) =>
      apiFetch<ContractTerms>(`/api/contracts/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-terms'] });
      queryClient.invalidateQueries({ queryKey: ['contract-term', variables.id] });
    },
  });
}

// --- ESign Envelopes ---

export function useESignEnvelopes(contractId?: string) {
  return useQuery({
    queryKey: ['esign-envelopes', contractId],
    queryFn: () =>
      apiFetch<PaginatedResponse<ESignEnvelope>>('/api/esign', {
        params: { contract_id: contractId },
      }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useCreateESignEnvelope() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ESignEnvelope>) =>
      apiFetch<ESignEnvelope>('/api/esign', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['esign-envelopes'] });
    },
  });
}

export function useUpdateESignEnvelope() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ESignEnvelope> & { id: string }) =>
      apiFetch<ESignEnvelope>(`/api/esign/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['esign-envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['esign-envelope', variables.id] });
    },
  });
}

// --- ESign Documents ---

export function useESignDocuments(envelopeId: string) {
  return useQuery({
    queryKey: ['esign-documents', envelopeId],
    queryFn: () => apiFetch<ESignDocument[]>(`/api/esign/${envelopeId}/documents`),
    enabled: !!envelopeId,
  });
}
