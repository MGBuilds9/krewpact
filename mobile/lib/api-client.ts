import { API_BASE_URL } from '@/constants/config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    throw new ApiError(
      `API error ${response.status}: ${response.statusText}`,
      response.status,
      data,
    );
  }

  return response.json() as Promise<T>;
}

// TypeScript interfaces
export interface DashboardData {
  activeProjects: number;
  healthyProjects: number;
  overdueTasks: number;
  upcomingMilestones: number;
  projectHealth: ProjectHealth[];
}

export interface Project {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  org_id: string;
}

export interface ProjectHealth {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  health: 'healthy' | 'at_risk' | 'critical';
  milestone_total: number;
  milestone_complete: number;
  overdue_tasks: number;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assignee_id: string | null;
  project_id: string;
}

export interface Lead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  status: string;
  source: string | null;
  score: number | null;
}

export interface DailyLog {
  id: string;
  project_id: string;
  summary: string;
  weather: string | null;
  workers_on_site: number | null;
  photos: string[];
  created_at: string;
  created_by: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
}

// API object
export const api = {
  dashboard: {
    get: () => apiFetch<DashboardData>('/api/dashboard'),
  },
  projects: {
    list: () => apiFetch<Project[]>('/api/projects'),
    get: (id: string) => apiFetch<Project>(`/api/projects/${id}`),
    tasks: {
      list: (projectId: string) =>
        apiFetch<Task[]>(`/api/projects/${projectId}/tasks`),
    },
    dailyLogs: {
      list: (projectId: string) =>
        apiFetch<DailyLog[]>(`/api/projects/${projectId}/daily-logs`),
      create: (projectId: string, data: Partial<DailyLog>) =>
        apiFetch<DailyLog>(`/api/projects/${projectId}/daily-logs`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
  },
  crm: {
    leads: {
      list: () => apiFetch<Lead[]>('/api/crm/leads'),
    },
  },
  timesheets: {
    clockIn: (data: { project_id?: string }) =>
      apiFetch<TimeEntry>('/api/timesheets/clock', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    clockOut: (id: string) =>
      apiFetch<TimeEntry>(`/api/timesheets/clock/${id}`, {
        method: 'PATCH',
      }),
  },
};
