'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

interface DigestSection {
  title: string;
  items: Array<{ label: string; value: string; url?: string }>;
}

interface Digest {
  id: string;
  summary: string;
  sections: DigestSection[];
  digest_date: string;
}

interface Insight {
  id: string;
  entity_type: string;
  entity_id: string;
  insight_type: string;
  title: string;
  content: string;
  confidence: number;
  created_at: string;
}

interface AiPreferences {
  insight_min_confidence: number;
  digest_enabled: boolean;
  ai_suggestions_enabled: boolean;
}

export interface NLQueryResult {
  answer: string;
  plan?: string;
  toolCalls?: Array<{ name: string; result: unknown }>;
}

export function useDigest() {
  return useQuery({
    queryKey: ['ai', 'digest'],
    queryFn: () => apiFetch<{ digest: Digest | null }>('/api/ai/digest').then((d) => d.digest),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useInsights(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['ai', 'insights', entityType, entityId],
    queryFn: () =>
      apiFetch<{ insights: Insight[] }>(
        `/api/ai/insights?entity_type=${entityType}&entity_id=${entityId}`,
      ).then((d) => d.insights),
    enabled: !!entityType && !!entityId,
  });
}

export function useAiPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ai', 'preferences'],
    queryFn: () =>
      apiFetch<{ preferences: AiPreferences }>('/api/ai/preferences').then((d) => d.preferences),
  });

  const mutation = useMutation({
    mutationFn: (prefs: Partial<AiPreferences>) =>
      apiFetch('/api/ai/preferences', { method: 'PATCH', body: prefs }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai', 'preferences'] }),
  });

  return { ...query, updatePreferences: mutation.mutate };
}

export function useNLQuery() {
  return useMutation({
    mutationFn: (question: string) =>
      apiFetch<NLQueryResult>('/api/ai/query', {
        method: 'POST',
        body: { query: question },
      }),
  });
}
