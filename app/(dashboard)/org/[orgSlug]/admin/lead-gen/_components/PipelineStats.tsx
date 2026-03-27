'use client';

import { Clock, ListChecks, Users, Zap } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface PipelineStatsProps {
  newLeadsCount: number;
  activeSequenceCount: number;
  totalLeads: number;
}

export function PipelineStats({
  newLeadsCount,
  activeSequenceCount,
  totalLeads,
}: PipelineStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Zap className="h-4 w-4" /> Apollo Pump
          </div>
          <div className="text-2xl font-bold">—</div>
          <p className="text-xs text-muted-foreground mt-1">No runs recorded</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="h-4 w-4" /> Enrichment Queue
          </div>
          <div className="text-2xl font-bold">{newLeadsCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Pending leads</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ListChecks className="h-4 w-4" /> Active Sequences
          </div>
          <div className="text-2xl font-bold">{activeSequenceCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Running sequences</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" /> Total Leads
          </div>
          <div className="text-2xl font-bold">{totalLeads}</div>
          <p className="text-xs text-muted-foreground mt-1">In pipeline</p>
        </CardContent>
      </Card>
    </div>
  );
}
