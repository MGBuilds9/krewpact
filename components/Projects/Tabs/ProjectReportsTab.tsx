'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Calendar, User } from 'lucide-react';
import { useProjectReports, REPORT_TYPES } from '@/hooks/useProjectReports';

interface ProjectReportsTabProps {
  projectId: string;
}

export function ProjectReportsTab({ projectId }: ProjectReportsTabProps) {
  const { data: reports = [], isLoading } = useProjectReports(projectId);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'reviewed':
        return 'default' as const;
      case 'submitted':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Project Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Total Reports</div>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Submitted</div>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === 'submitted' || r.status === 'reviewed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Drafts</div>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === 'draft').length}
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
      ) : reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => {
            const typeInfo = REPORT_TYPES.find((t) => t.value === report.report_type);
            return (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          {typeInfo?.label || report.report_type}
                        </span>
                        <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(report.report_date).toLocaleDateString()}
                        </span>
                        {report.user && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {report.user.first_name} {report.user.last_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No reports yet</h3>
            <p className="text-muted-foreground">
              Reports linked to this project will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
