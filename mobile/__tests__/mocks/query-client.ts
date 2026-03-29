export const queryKeys = {
  dashboard: ['dashboard'] as const,
  projects: ['projects'] as const,
  leads: ['leads'] as const,
  project: (id: string) => ['project', id] as const,
  projectTasks: (id: string) => ['projectTasks', id] as const,
  projectDailyLogs: (id: string) => ['projectDailyLogs', id] as const,
  projectTimeEntries: (id: string) => ['projectTimeEntries', id] as const,
  projectSafetyForms: (id: string) => ['projectSafetyForms', id] as const,
  notifications: ['notifications'] as const,
  syncStatus: ['sync-status'] as const,
};
