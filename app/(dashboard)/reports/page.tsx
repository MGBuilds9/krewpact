'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Calendar, User, Plus } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  const { data: reports, isLoading } = useReports();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Reports — KrewPact</title>
      <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily Logs</h1>
            <p className="text-muted-foreground">{reports?.length ?? 0} logs</p>
          </div>
        </div>
        <Button onClick={() => router.push('/reports/new')}>
          <Plus className="h-4 w-4 mr-2" />New Daily Log
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground mb-1">Total</div><div className="text-2xl font-bold">{reports?.length ?? 0}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground mb-1">Submitted</div><div className="text-2xl font-bold">{reports?.filter((r) => r.submitted_at !== null).length ?? 0}</div></CardContent></Card>
      </div>

      {(reports ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No daily logs</h3>
          <p className="text-muted-foreground mb-4">Create your first daily log to get started</p>
          <Button variant="outline" onClick={() => router.push('/reports/new')}><Plus className="h-4 w-4 mr-2" />New Daily Log</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(reports ?? []).map((report) => (
            <Card key={report.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">Daily Log</span>
                      {report.submitted_at && <Badge variant="default">Submitted</Badge>}
                      {!report.submitted_at && <Badge variant="secondary">Draft</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(report.log_date).toLocaleDateString()}</span>
                      {report.submitted_user && <span className="flex items-center gap-1"><User className="h-3 w-3" />{report.submitted_user.first_name} {report.submitted_user.last_name}</span>}
                      {report.project && <span className="text-primary">{report.project.project_name}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
