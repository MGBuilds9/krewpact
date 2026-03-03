'use client';

import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Workflow } from 'lucide-react';
import { useSequences } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';

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
  const { activeDivision } = useDivision();

  const { data: sequences, isLoading } = useSequences({
    divisionId: activeDivision?.id,
  });

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

  return (
    <>
      <title>Sequences — KrewPact</title>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Outreach Sequences</h2>
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
          <Card>
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
                      {sequence.division_id ?? 'All divisions'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sequence.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
