import { API_BASE_URL } from '@/constants/config';

// ============================================================
// Error handling
// ============================================================

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

// ============================================================
// Token provider (set by AuthProvider)
// ============================================================

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

// ============================================================
// Base fetch helper
// ============================================================

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

// ============================================================
// Response wrappers — match web app pagination helper
// ============================================================

/** All list endpoints return this shape via lib/api/pagination.ts */
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================
// Types — aligned with actual API response shapes
// ============================================================

/** GET /api/dashboard */
export interface DashboardData {
  atAGlance: {
    activeProjects: number;
    pendingExpenses: number;
    openLeads: number;
    unreadNotifications: number;
  };
  recentProjects: Project[];
}

/** GET /api/projects → PaginatedResponse<Project> */
export interface Project {
  id: string;
  project_name: string;
  project_number: string;
  status: string;
  division_id: string;
  account_id: string | null;
  contact_id: string | null;
  baseline_budget: number | null;
  current_budget: number | null;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  site_address: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** GET /api/projects/[id]/tasks → PaginatedResponse<Task> */
export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_user_id: string | null;
  milestone_id: string | null;
  start_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** GET /api/crm/leads → { data: Lead[], total, hasMore } */
export interface Lead {
  id: string;
  company_name: string | null;
  status: string;
  lead_score: number | null;
  fit_score: number | null;
  intent_score: number | null;
  engagement_score: number | null;
  source_channel: string | null;
  assigned_to: string | null;
  division_id: string;
  city: string | null;
  province: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /api/projects/[id]/daily-logs → PaginatedResponse<DailyLog> */
export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;
  work_summary: string | null;
  crew_count: number | null;
  delays: string | null;
  safety_notes: string | null;
  weather: Record<string, unknown> | null;
  is_offline_origin: boolean;
  submitted_at: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
}

/** POST body for daily log creation — matches dailyLogCreateSchema */
export interface DailyLogCreate {
  log_date: string;
  work_summary?: string;
  crew_count?: number;
  weather?: Record<string, unknown>;
  delays?: string;
  safety_notes?: string;
  is_offline_origin?: boolean;
}

/** GET /api/projects/[id]/time-entries → PaginatedResponse<TimeEntry> */
export interface TimeEntry {
  id: string;
  project_id: string;
  task_id: string | null;
  user_id: string;
  work_date: string;
  hours_regular: number;
  hours_overtime: number;
  cost_code: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

/** POST body for time entry — matches timeEntryCreateSchema */
export interface TimeEntryCreate {
  user_id: string;
  work_date: string;
  hours_regular: number;
  hours_overtime?: number;
  task_id?: string;
  cost_code?: string;
  notes?: string;
  source?: string;
}

/** GET /api/notifications → PaginatedResponse<Notification> */
export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
}

// ============================================================
// API client — endpoints match actual web app routes
// ============================================================

export const api = {
  dashboard: {
    get: () => apiFetch<DashboardData>('/api/dashboard'),
  },

  projects: {
    list: () => apiFetch<PaginatedResponse<Project>>('/api/projects').then((r) => r.data),
    get: (id: string) => apiFetch<Project>(`/api/projects/${id}`),

    tasks: {
      list: (projectId: string) =>
        apiFetch<PaginatedResponse<Task>>(`/api/projects/${projectId}/tasks`).then((r) => r.data),
    },

    dailyLogs: {
      list: (projectId: string) =>
        apiFetch<PaginatedResponse<DailyLog>>(`/api/projects/${projectId}/daily-logs`).then(
          (r) => r.data,
        ),
      create: (projectId: string, data: DailyLogCreate) =>
        apiFetch<DailyLog>(`/api/projects/${projectId}/daily-logs`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },

    timeEntries: {
      list: (projectId: string) =>
        apiFetch<PaginatedResponse<TimeEntry>>(`/api/projects/${projectId}/time-entries`).then(
          (r) => r.data,
        ),
      create: (projectId: string, data: TimeEntryCreate) =>
        apiFetch<TimeEntry>(`/api/projects/${projectId}/time-entries`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
  },

  crm: {
    leads: {
      list: () =>
        apiFetch<{ data: Lead[]; total: number; hasMore: boolean }>('/api/crm/leads').then(
          (r) => r.data,
        ),
    },
  },

  notifications: {
    list: () =>
      apiFetch<PaginatedResponse<AppNotification>>('/api/notifications').then((r) => r.data),
  },
};
