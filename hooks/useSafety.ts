'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface SafetyForm {
  id: string;
  project_id: string;
  form_type: string;
  form_date: string;
  state: string;
  payload: Record<string, unknown>;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyIncident {
  id: string;
  project_id: string;
  incident_date: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  details: Record<string, unknown>;
  reported_by: string | null;
  corrective_actions: Record<string, unknown> | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolboxTalk {
  id: string;
  project_id: string;
  talk_date: string;
  topic: string;
  facilitator_user_id: string | null;
  attendee_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  project_id: string;
  inspection_type: string;
  inspection_date: string;
  state: string;
  payload: Record<string, unknown>;
  inspector_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Safety Forms ──────────────────────────────────────────────────────────────

export function useSafetyForms(projectId: string) {
  return useQuery({
    queryKey: ['safety-forms', projectId],
    queryFn: () => apiFetch<{ data: SafetyForm[]; total: number; hasMore: boolean }>(`/api/projects/${projectId}/safety/forms`),
    staleTime: 30_000,
  });
}

export function useCreateSafetyForm(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<SafetyForm>(`/api/projects/${projectId}/safety/forms`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-forms', projectId] }),
  });
}

export function useUpdateSafetyForm(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch<SafetyForm>(`/api/projects/${projectId}/safety/forms/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-forms', projectId] }),
  });
}

export function useDeleteSafetyForm(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/projects/${projectId}/safety/forms/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-forms', projectId] }),
  });
}

// ─── Safety Incidents ──────────────────────────────────────────────────────────

export function useSafetyIncidents(projectId: string) {
  return useQuery({
    queryKey: ['safety-incidents', projectId],
    queryFn: () => apiFetch<{ data: SafetyIncident[]; total: number; hasMore: boolean }>(`/api/projects/${projectId}/safety/incidents`),
    staleTime: 30_000,
  });
}

export function useCreateSafetyIncident(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<SafetyIncident>(`/api/projects/${projectId}/safety/incidents`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-incidents', projectId] }),
  });
}

export function useUpdateSafetyIncident(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch<SafetyIncident>(`/api/projects/${projectId}/safety/incidents/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-incidents', projectId] }),
  });
}

export function useDeleteSafetyIncident(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/projects/${projectId}/safety/incidents/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-incidents', projectId] }),
  });
}

// ─── Toolbox Talks ─────────────────────────────────────────────────────────────

export function useToolboxTalks(projectId: string) {
  return useQuery({
    queryKey: ['toolbox-talks', projectId],
    queryFn: () => apiFetch<{ data: ToolboxTalk[]; total: number; hasMore: boolean }>(`/api/projects/${projectId}/safety/toolbox-talks`),
    staleTime: 30_000,
  });
}

export function useCreateToolboxTalk(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<ToolboxTalk>(`/api/projects/${projectId}/safety/toolbox-talks`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['toolbox-talks', projectId] }),
  });
}

export function useUpdateToolboxTalk(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch<ToolboxTalk>(`/api/projects/${projectId}/safety/toolbox-talks/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['toolbox-talks', projectId] }),
  });
}

export function useDeleteToolboxTalk(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/projects/${projectId}/safety/toolbox-talks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['toolbox-talks', projectId] }),
  });
}

// ─── Inspections ───────────────────────────────────────────────────────────────

export function useInspections(projectId: string) {
  return useQuery({
    queryKey: ['inspections', projectId],
    queryFn: () => apiFetch<{ data: Inspection[]; total: number; hasMore: boolean }>(`/api/projects/${projectId}/safety/inspections`),
    staleTime: 30_000,
  });
}

export function useCreateInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<Inspection>(`/api/projects/${projectId}/safety/inspections`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', projectId] }),
  });
}

export function useUpdateInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch<Inspection>(`/api/projects/${projectId}/safety/inspections/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', projectId] }),
  });
}

export function useDeleteInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/projects/${projectId}/safety/inspections/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', projectId] }),
  });
}
