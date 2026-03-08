'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { useBCPIncidents, useUpdateBCPIncident } from '@/hooks/useGovernance';
import { BCPIncidentForm } from '@/components/BCP/BCPIncidentForm';
import { BCPRecoveryEventForm } from '@/components/BCP/BCPRecoveryEventForm';

const SEV_COLORS: Record<string, string> = {
  sev1: 'bg-red-600',
  sev2: 'bg-orange-500',
  sev3: 'bg-yellow-500',
  sev4: 'bg-blue-400',
};

export default function BCPPage() {
  const { data, isLoading } = useBCPIncidents();
  const update = useUpdateBCPIncident();
  const [open, setOpen] = useState(false);

  const incidents = data?.data ?? [];

  async function resolve(id: string) {
    await update.mutateAsync({ id, status: 'resolved', resolved_at: new Date().toISOString() });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Continuity</h1>
          <p className="text-sm text-muted-foreground">Track incidents and recovery events.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Declare Incident
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Declare BCP Incident</DialogTitle>
            </DialogHeader>
            <BCPIncidentForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <AlertTriangle className="mb-4 h-12 w-12" />
          <p>No incidents recorded. Good standing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Card key={inc.id} className={inc.status === 'open' ? 'border-red-300' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${SEV_COLORS[inc.severity] ?? 'bg-gray-400'}`}
                    />
                    <CardTitle className="text-base">{inc.title}</CardTitle>
                    <Badge variant="outline">{inc.incident_number}</Badge>
                  </div>
                  <Badge className="uppercase">{inc.status.replace('_', ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {inc.summary && <p className="text-sm text-muted-foreground">{inc.summary}</p>}
                <BCPRecoveryEventForm incidentId={inc.id} />
                {inc.status === 'open' && (
                  <Button variant="outline" size="sm" onClick={() => resolve(inc.id)}>
                    Mark Resolved
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
