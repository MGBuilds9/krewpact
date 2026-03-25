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
    timeEntries: { list: jest.fn(), create: jest.fn() },
  },
  crm: { leads: { list: jest.fn() } },
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
