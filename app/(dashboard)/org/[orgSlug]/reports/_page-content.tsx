'use client';

import { Calendar, ClipboardList, Plus, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useReports } from '@/hooks/useReports';

type Report = {
  id: string;
  log_date: string;
  submitted_at?: string | null;
  submitted_user?: { first_name?: string | null; last_name?: string | null } | null;
  project?: { project_name: string } | null;
};

function ReportCard({ report }: { report: Report }) {
  const user = report.submitted_user;
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="font-semibold">Daily Log</span>
              {report.submitted_at ? (
                <Badge variant="default">Submitted</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(report.log_date).toLocaleDateString()}
              </span>
              {user && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {user.first_name} {user.last_name}
                </span>
              )}
              {report.project && (
                <span className="text-primary">{report.project.project_name}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { push: orgPush } = useOrgRouter();
  const { data: reports, isLoading } = useReports();

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );

  const allReports = reports || [];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Daily Logs</h1>
              <p className="text-muted-foreground">{allReports.length} logs</p>
            </div>
          </div>
          <Button onClick={() => orgPush('/reports/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Daily Log
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total</div>
              <div className="text-2xl font-bold">{allReports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Submitted</div>
              <div className="text-2xl font-bold">
                {allReports.filter((r) => r.submitted_at !== null).length}
              </div>
            </CardContent>
          </Card>
        </div>
        {allReports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No daily logs</h3>
              <p className="text-muted-foreground mb-4">
                Create your first daily log to get started
              </p>
              <Button variant="outline" onClick={() => orgPush('/reports/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Daily Log
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {allReports.map((report) => (
              <ReportCard key={report.id} report={report as Report} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
