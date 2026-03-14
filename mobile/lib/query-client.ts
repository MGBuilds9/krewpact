import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['project', id] as const,
  projectTasks: (id: string) => ['project', id, 'tasks'] as const,
  projectDailyLogs: (id: string) => ['project', id, 'daily-logs'] as const,
  leads: ['leads'] as const,
  timesheets: ['timesheets'] as const,
};
