'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertTriangle, ClipboardList, Users, Search } from 'lucide-react';
import {
  useSafetyForms,
  useSafetyIncidents,
  useToolboxTalks,
  useInspections,
  useCreateSafetyForm,
  useCreateSafetyIncident,
  useCreateToolboxTalk,
  useCreateInspection,
} from '@/hooks/useSafety';
import { SafetyForm } from '@/components/Safety/SafetyForm';
import { SafetyIncidentForm } from '@/components/Safety/SafetyIncidentForm';
import { ToolboxTalkForm } from '@/components/Safety/ToolboxTalkForm';
import { InspectionForm } from '@/components/Safety/InspectionForm';

const SEVERITY_VARIANT = {
  low: 'secondary',
  medium: 'outline',
  high: 'destructive',
  critical: 'destructive',
} as const;

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function ProjectSafetyPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const { data: formsRes, isLoading: loadingForms } = useSafetyForms(projectId);
  const { data: incidentsRes, isLoading: loadingIncidents } = useSafetyIncidents(projectId);
  const { data: talksRes, isLoading: loadingTalks } = useToolboxTalks(projectId);
  const { data: inspectionsRes, isLoading: loadingInspections } = useInspections(projectId);

  const createForm = useCreateSafetyForm(projectId);
  const createIncident = useCreateSafetyIncident(projectId);
  const createTalk = useCreateToolboxTalk(projectId);
  const createInspection = useCreateInspection(projectId);

  const forms = formsRes?.data ?? [];
  const incidents = incidentsRes?.data ?? [];
  const talks = talksRes?.data ?? [];
  const inspections = inspectionsRes?.data ?? [];

  const openIncidents = incidents.filter((i) => !i.closed_at).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Safety</h1>
          <p className="text-muted-foreground text-sm">
            Forms, incidents, toolbox talks, and site inspections
          </p>
        </div>
        {openIncidents > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {openIncidents} open incident{openIncidents > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="forms">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forms">
            <ClipboardList className="h-4 w-4 mr-1" />
            Forms ({forms.length})
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Incidents ({incidents.length})
          </TabsTrigger>
          <TabsTrigger value="talks">
            <Users className="h-4 w-4 mr-1" />
            Toolbox Talks ({talks.length})
          </TabsTrigger>
          <TabsTrigger value="inspections">
            <Search className="h-4 w-4 mr-1" />
            Inspections ({inspections.length})
          </TabsTrigger>
        </TabsList>

        {/* Safety Forms */}
        <TabsContent value="forms" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={openDialog === 'form'}
              onOpenChange={(o) => setOpenDialog(o ? 'form' : null)}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New Form
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Safety Form</DialogTitle>
                </DialogHeader>
                <SafetyForm
                  onSubmit={(values) => {
                    createForm.mutate(values, { onSuccess: () => setOpenDialog(null) });
                  }}
                  isLoading={createForm.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          {loadingForms ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-2">
              {forms.length === 0 && (
                <p className="text-muted-foreground text-sm">No safety forms yet.</p>
              )}
              {forms.map((f) => (
                <Card key={f.id}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div>
                      <p className="font-medium text-sm">{f.form_type}</p>
                      <p className="text-xs text-muted-foreground">{f.form_date}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {f.state}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Incidents */}
        <TabsContent value="incidents" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={openDialog === 'incident'}
              onOpenChange={(o) => setOpenDialog(o ? 'incident' : null)}
            >
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
                  onSubmit={(values) => {
                    createIncident.mutate(values, { onSuccess: () => setOpenDialog(null) });
                  }}
                  isLoading={createIncident.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          {loadingIncidents ? (
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

        {/* Toolbox Talks */}
        <TabsContent value="talks" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={openDialog === 'talk'}
              onOpenChange={(o) => setOpenDialog(o ? 'talk' : null)}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Log Talk
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Toolbox Talk</DialogTitle>
                </DialogHeader>
                <ToolboxTalkForm
                  onSubmit={(values) => {
                    createTalk.mutate(values, { onSuccess: () => setOpenDialog(null) });
                  }}
                  isLoading={createTalk.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          {loadingTalks ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-2">
              {talks.length === 0 && (
                <p className="text-muted-foreground text-sm">No toolbox talks recorded.</p>
              )}
              {talks.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div>
                      <p className="font-medium text-sm">{t.topic}</p>
                      <p className="text-xs text-muted-foreground">{t.talk_date}</p>
                    </div>
                    <Badge variant="secondary">{t.attendee_count} attendees</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Inspections */}
        <TabsContent value="inspections" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={openDialog === 'inspection'}
              onOpenChange={(o) => setOpenDialog(o ? 'inspection' : null)}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New Inspection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Inspection</DialogTitle>
                </DialogHeader>
                <InspectionForm
                  onSubmit={(values) => {
                    createInspection.mutate(values, { onSuccess: () => setOpenDialog(null) });
                  }}
                  isLoading={createInspection.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          {loadingInspections ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-2">
              {inspections.length === 0 && (
                <p className="text-muted-foreground text-sm">No inspections recorded.</p>
              )}
              {inspections.map((insp) => (
                <Card key={insp.id}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div>
                      <p className="font-medium text-sm">{insp.inspection_type}</p>
                      <p className="text-xs text-muted-foreground">{insp.inspection_date}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {insp.state}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
