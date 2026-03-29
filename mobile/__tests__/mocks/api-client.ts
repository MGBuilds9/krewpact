export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = {
  dashboard: { get: jest.fn() },
  projects: {
    list: jest.fn(),
    get: jest.fn(),
    tasks: { list: jest.fn() },
    dailyLogs: { list: jest.fn(), create: jest.fn() },
    timeEntries: { list: jest.fn(), create: jest.fn() },
  },
  safety: {
    forms: { list: jest.fn(), create: jest.fn() },
  },
  crm: { leads: { list: jest.fn() } },
  notifications: { list: jest.fn() },
};

export type DashboardData = {
  atAGlance: {
    activeProjects: number;
    openLeads: number;
    pendingExpenses: number;
    unreadNotifications: number;
  };
  recentProjects: Project[];
};

export type Project = {
  id: string;
  project_name: string;
  project_number: string;
  status: string;
  start_date: string | null;
  target_completion_date: string | null;
};

export type Lead = {
  id: string;
  company_name: string | null;
  status: string;
  city: string | null;
  province: string | null;
  industry: string | null;
  source_channel: string | null;
  lead_score: number | null;
};

export type Task = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
};

export type DailyLog = {
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
};

export type DailyLogCreate = {
  log_date: string;
  work_summary?: string;
  crew_count?: number;
  weather?: Record<string, unknown>;
  delays?: string;
  safety_notes?: string;
};

export type TimeEntry = {
  id: string;
  work_date: string;
  hours_regular: number;
  hours_overtime: number;
  notes: string | null;
};

export type TimeEntryCreate = {
  user_id: string;
  work_date: string;
  hours_regular: number;
  hours_overtime: number;
  notes?: string;
  source: string;
};

export type SafetyForm = {
  id: string;
  project_id: string;
  form_type: string;
  created_at: string;
};

export type SafetyFormCreate = {
  project_id: string;
  form_type: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
};
