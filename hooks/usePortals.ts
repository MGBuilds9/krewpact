'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface PortalAccount {
  id: string;
  actor_type: 'client' | 'trade_partner';
  company_name: string | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PortalPermission {
  id: string;
  portal_account_id: string;
  project_id: string;
  permission_set: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PortalMessage {
  id: string;
  portal_account_id: string | null;
  subject: string | null;
  body: string;
  direction: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export function usePortalAccounts(params?: {
  status?: string;
  actor_type?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['portal-accounts', params],
    queryFn: () => apiFetch<PaginatedResponse<PortalAccount>>('/api/portals/accounts', { params }),
    staleTime: 30_000,
  });
}

export function usePortalAccount(id: string) {
  return useQuery({
    queryKey: ['portal-account', id],
    queryFn: () => apiFetch<PortalAccount>(`/api/portals/accounts/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useInvitePortalAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<PortalAccount>('/api/portals/accounts', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-accounts'] });
    },
  });
}

export function useUpdatePortalAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch<PortalAccount>(`/api/portals/accounts/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['portal-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['portal-account', vars.id] });
    },
  });
}

export function usePortalPermissions(portalAccountId?: string) {
  return useQuery({
    queryKey: ['portal-permissions', portalAccountId],
    queryFn: () =>
      apiFetch<PaginatedResponse<PortalPermission>>('/api/portals/permissions', {
        params: { portal_account_id: portalAccountId },
      }),
    enabled: !!portalAccountId,
    staleTime: 30_000,
  });
}

export function useSetPortalPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<PortalPermission>('/api/portals/permissions', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-permissions'] });
    },
  });
}

export function usePortalMessages(portalAccountId?: string) {
  return useQuery({
    queryKey: ['portal-messages', portalAccountId],
    queryFn: () =>
      apiFetch<PaginatedResponse<PortalMessage>>('/api/portals/messages', {
        params: { portal_account_id: portalAccountId },
      }),
    staleTime: 30_000,
  });
}

export function useSendPortalMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<PortalMessage>('/api/portals/messages', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages'] });
    },
  });
}
