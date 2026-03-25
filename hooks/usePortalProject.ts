'use client';

import { useCallback, useEffect, useState } from 'react';

export interface PortalMilestone {
  id: string;
  name: string;
  due_date: string | null;
  completed_at: string | null;
  status: string;
  sort_order: number;
}

export interface PortalTask {
  id: string;
  title: string;
  status: string;
  milestone_id: string | null;
  due_date: string | null;
  completed_at: string | null;
}

export interface ProgressSummary {
  total_milestones: number;
  completed_milestones: number;
  completion_pct: number;
}

export interface ProgressData {
  milestones: PortalMilestone[];
  tasks: PortalTask[];
  summary: ProgressSummary;
}

export interface PortalDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: string;
  title: string;
  meeting_date: string;
  attendees: string[] | null;
  summary: string;
  action_items: string[] | null;
  created_at: string;
}

export interface SurveyData {
  id: string;
  overall_rating: number;
  communication_rating: number;
  quality_rating: number;
  schedule_rating: number;
  comments: string | null;
  would_recommend: boolean;
  submitted_at: string;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useFetch<T>(url: string): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }
      const data: T = await res.json();
      setState({ data, loading: false, error: null });
    } catch (err: unknown) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load',
      });
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

export function usePortalProgress(projectId: string) {
  return useFetch<ProgressData>(`/api/portal/projects/${projectId}/progress`);
}

export function usePortalDocuments(projectId: string) {
  return useFetch<{ data: PortalDocument[]; total: number; hasMore: boolean }>(
    `/api/portal/projects/${projectId}/documents`,
  );
}

export function usePortalMeetings(projectId: string) {
  return useFetch<{ data: MeetingNote[]; total: number; hasMore: boolean }>(
    `/api/portal/projects/${projectId}/meetings`,
  );
}

export function usePortalSurvey(projectId: string) {
  return useFetch<{ survey: SurveyData | null }>(`/api/portal/projects/${projectId}/survey`);
}
