'use client';

import { BarChart3, List, Plus, Workflow } from 'lucide-react';
import { useState } from 'react';

import { SequenceMonitorCard } from '@/components/CRM/SequenceMonitorCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDivisionFilter, useDivision } from '@/contexts/DivisionContext';
import { useSequenceAnalytics, useSequences } from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';

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

type AnalyticsItem = {
  sequence_id: string;
  enrollments: { active: number; completed: number; paused: number; failed: number };
};

function aggregateTotals(analytics: AnalyticsItem[]) {
  return analytics.reduce(
    (acc, a) => ({
      totalActive: acc.totalActive + a.enrollments.active,
      totalCompleted: acc.totalCompleted + a.enrollments.completed,
      totalPaused: acc.totalPaused + a.enrollments.paused,
      totalFailed: acc.totalFailed + a.enrollments.failed,
    }),
    { totalActive: 0, totalCompleted: 0, totalPaused: 0, totalFailed: 0 },
  );
}

interface SummaryStat {
  label: string;
  value: number;
  color: string;
}
function SummaryStatCard({ label, value, color }: SummaryStat) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

type SequenceRow = {
  id: string;
  name: string;
  description?: string | null;
  trigger_type: string;
  sequence_steps?: unknown[];
  is_active: boolean;
  division_id?: string | null;
  created_at: string;
};

function SequenceTableRow({
  sequence,
  divisionName,
  onNavigate,
}: {
  sequence: SequenceRow;
  divisionName: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onNavigate(sequence.id)}>
      <TableCell>
        <p className="font-medium">{sequence.name}</p>
        {sequence.description && (
          <p className="text-xs text-muted-foreground truncate max-w-xs">{sequence.description}</p>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatTriggerType(sequence.trigger_type)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {sequence.sequence_steps?.length ?? '-'}
      </TableCell>
      <TableCell>
        <Badge
          className={
            sequence.is_active
              ? 'bg-green-100 text-green-700 border-green-200 border'
              : 'bg-gray-100 text-gray-600 border-gray-200 border'
          }
          variant="outline"
        >
          {sequence.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{divisionName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(sequence.created_at)}
      </TableCell>
    </TableRow>
  );
}

// eslint-disable-next-line max-lines-per-function
export default function SequencesPage() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision, userDivisions } = useDivision();
  const [tab, setTab] = useState('monitor');
  const divId = getDivisionFilter(activeDivision);
  const { data: sequences, isLoading } = useSequences({ divisionId: divId });
  const { data: analyticsResponse } = useSequenceAnalytics(divId);
  const analytics = analyticsResponse ? analyticsResponse.data || [] : [];

  if (isLoading)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56 animate-pulse" />
          <Skeleton className="h-10 w-40 animate-pulse" />
        </div>
        <Skeleton className="h-64 rounded-xl animate-pulse" />
      </div>
    );

  const sequenceList = sequences || [];
  const { totalActive, totalCompleted, totalPaused, totalFailed } = aggregateTotals(analytics);

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
            {analytics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryStatCard
                  label="Active Enrollments"
                  value={totalActive}
                  color="text-blue-600"
                />
                <SummaryStatCard label="Completed" value={totalCompleted} color="text-green-600" />
                <SummaryStatCard label="Paused" value={totalPaused} color="text-yellow-600" />
                <SummaryStatCard label="Failed" value={totalFailed} color="text-red-600" />
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
                        {sequenceList.map((sequence) => {
                          const foundDiv = sequence.division_id
                            ? userDivisions.find((d) => d.id === sequence.division_id)
                            : null;
                          const divisionName = sequence.division_id
                            ? foundDiv
                              ? foundDiv.name
                              : 'Division'
                            : 'All divisions';
                          return (
                            <SequenceTableRow
                              key={sequence.id}
                              sequence={sequence}
                              divisionName={divisionName}
                              onNavigate={(id) => orgPush(`/crm/sequences/${id}`)}
                            />
                          );
                        })}
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
