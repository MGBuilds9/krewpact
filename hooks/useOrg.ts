'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface Division {
  id: string;
  division_name: string;
  division_code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgUser {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
  role_ids: string[];
  division_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  role_key: string;
  role_name: string;
  role_type: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  permission_key: string;
  description: string | null;
  resource: string;
  action: string;
}

export interface PolicyOverride {
  id: string;
  user_id: string;
  permission_id: string;
  override_value: boolean;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_hours: Record<string, unknown> | null;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// Divisions
export function useDivisions() {
  return useQuery({
    queryKey: ['divisions'],
    queryFn: () => apiFetch<PaginatedResponse<Division>>('/api/org/divisions'),
    staleTime: 30_000,
  });
}

export function useCreateDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<Division>('/api/org/divisions', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
    },
  });
}

export function useUpdateDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch<Division>(`/api/org/divisions/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
    },
  });
}

// Users
export function useOrgUsers(params?: { search?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['org-users', params],
    queryFn: () => apiFetch<PaginatedResponse<OrgUser>>('/api/org/users', { params }),
    staleTime: 30_000,
  });
}

export function useProvisionUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<OrgUser>('/api/org/users', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
    },
  });
}

export function useUpdateOrgUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch<OrgUser>(`/api/org/users/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
    },
  });
}

// Roles
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => apiFetch<PaginatedResponse<Role>>('/api/org/roles'),
    staleTime: 30_000,
  });
}

export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: () => apiFetch<Permission[]>(`/api/org/roles/${roleId}/permissions`),
    enabled: !!roleId,
    staleTime: 30_000,
  });
}

export function useSetRolePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, ...data }: { roleId: string } & Record<string, unknown>) =>
      apiFetch<void>(`/api/org/roles/${roleId}/permissions`, { method: 'POST', body: data }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', vars.roleId] });
    },
  });
}

// Policy Overrides
export function usePolicyOverrides(userId?: string) {
  return useQuery({
    queryKey: ['policy-overrides', userId],
    queryFn: () => apiFetch<PaginatedResponse<PolicyOverride>>('/api/org/policy-overrides', {
      params: { user_id: userId },
    }),
    staleTime: 30_000,
  });
}

export function useCreatePolicyOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<PolicyOverride>('/api/org/policy-overrides', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-overrides'] });
    },
  });
}

// Notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => apiFetch<NotificationPreference>('/api/notifications/preferences'),
    staleTime: 30_000,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<NotificationPreference>('/api/notifications/preferences', { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
