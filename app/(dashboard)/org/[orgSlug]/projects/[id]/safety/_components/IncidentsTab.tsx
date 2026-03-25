'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { SafetyIncidentForm } from '@/components/Safety/SafetyIncidentForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TabsContent } from '@/components/ui/tabs';

import { LoadingSkeleton } from './LoadingSkeleton';

const SEVERITY_VARIANT = {
  low: 'secondary',
  medium: 'outline',
  high: 'destructive',
  critical: 'destructive',
} as const;

type Incident = {
  id: string;
  summary: string;
  incident_date: string;
  severity: keyof typeof SEVERITY_VARIANT;
  closed_at?: string | null;
};

export function IncidentsTab({
  incidents,
  loading,
  onCreate,
}: {
  incidents: Incident[];
  loading: boolean;
  onCreate: (v: unknown) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <TabsContent value="incidents" className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <Plus className="h-4 w-4 mr-1" /> Report Incident
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Safety Incident</DialogTitle>
            </DialogHeader>
            <SafetyIncidentForm
              onSubmit={(v) => {
                onCreate(v);
                setDialogOpen(false);
              }}
              isLoading={false}
            />
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-2">
          {incidents.length === 0 && (
            <p className="text-muted-foreground text-sm">No incidents recorded.</p>
          )}
          {incidents.map((inc) => (
            <Card key={inc.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-medium text-sm">{inc.summary}</p>
                  <p className="text-xs text-muted-foreground">{inc.incident_date}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={SEVERITY_VARIANT[inc.severity]} className="capitalize">
                    {inc.severity}
                  </Badge>
                  {inc.closed_at && <Badge variant="secondary">Closed</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
