'use client';

import { useState } from 'react';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Workflow, BarChart3, List } from 'lucide-react';
import { useSequences, useSequenceAnalytics } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';
import { SequenceMonitorCard } from '@/components/CRM/SequenceMonitorCard';

function formatTriggerType(trigger: string): string {
  return trigger
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SequencesPage() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision, userDivisions } = useDivision();
  const [tab, setTab] = useState('monitor');

  const { data: sequences, isLoading } = useSequences({
    divisionId: activeDivision?.id,
  });

  const { data: analyticsResponse } = useSequenceAnalytics(activeDivision?.id);
  const analytics = analyticsResponse?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56 animate-pulse" />
          <Skeleton className="h-10 w-40 animate-pulse" />
        </div>
        <Skeleton className="h-64 rounded-xl animate-pulse" />
      </div>
    );
  }

  const sequenceList = sequences ?? [];

  // Aggregate totals for summary
  const totalActive = analytics.reduce((s, a) => s + a.enrollments.active, 0);
  const totalCompleted = analytics.reduce((s, a) => s + a.enrollments.completed, 0);
  const totalPaused = analytics.reduce((s, a) => s + a.enrollments.paused, 0);
  const totalFailed = analytics.reduce((s, a) => s + a.enrollments.failed, 0);

  return (
    <>
      <title>Sequences — KrewPact</title>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Workflow className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Sequences</h1>
              <p className="text-muted-foreground text-sm">
                {sequenceList.length} sequence{sequenceList.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button onClick={() => orgPush('/crm/sequences/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Sequence
          </Button>
        </div>

        {sequenceList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Workflow className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No sequences yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first outreach sequence to automate lead follow-up
              </p>
              <Button onClick={() => orgPush('/crm/sequences/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Sequence
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            {analytics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{totalActive}</p>
                    <p className="text-xs text-muted-foreground">Active Enrollments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{totalPaused}</p>
                    <p className="text-xs text-muted-foreground">Paused</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{totalFailed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="monitor" className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  Monitor
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-1.5">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>

              <TabsContent value="monitor" className="space-y-4 mt-4">
                {analytics.map((a) => (
                  <SequenceMonitorCard key={a.sequence_id} analytics={a} />
                ))}
              </TabsContent>

              <TabsContent value="list" className="mt-4">
                <Card>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sequenceList.map((sequence) => (
                        <TableRow
                          key={sequence.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => orgPush(`/crm/sequences/${sequence.id}`)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{sequence.name}</p>
                              {sequence.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                  {sequence.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatTriggerType(sequence.trigger_type)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sequence.sequence_steps?.length ?? '-'}
                          </TableCell>
                          <TableCell>
                            {sequence.is_active ? (
                              <Badge
                                className="bg-green-100 text-green-700 border-green-200 border"
                                variant="outline"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                className="bg-gray-100 text-gray-600 border-gray-200 border"
                                variant="outline"
                              >
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sequence.division_id
                              ? userDivisions.find((d) => d.id === sequence.division_id)?.name ?? 'Division'
                              : 'All divisions'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(sequence.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}
