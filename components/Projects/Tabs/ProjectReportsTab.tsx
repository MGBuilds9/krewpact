'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Calendar, User } from 'lucide-react';
import { useProjectReports } from '@/hooks/useProjectReports';

interface ProjectReportsTabProps {
  projectId: string;
}

export function ProjectReportsTab({ projectId }: ProjectReportsTabProps) {
  const { data: logs = [], isLoading } = useProjectReports(projectId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Daily Logs</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Total Logs</div>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Average Crew Size</div>
            <div className="text-2xl font-bold">
              {logs.length > 0
                ? (logs.reduce((sum, l) => sum + (l.crew_count || 0), 0) / logs.length).toFixed(1)
                : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {log.work_summary || 'No summary'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.log_date).toLocaleDateString()}
                      </span>
                      {log.submitted_user && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.submitted_user.first_name} {log.submitted_user.last_name}
                        </span>
                      )}
                      {log.crew_count != null && (
                        <span>Crew: {log.crew_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No daily logs yet</h3>
            <p className="text-muted-foreground">
              Daily logs for this project will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
