'use client';

import { AlertTriangle, ClipboardList, Plus, Search, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { InspectionForm } from '@/components/Safety/InspectionForm';
import { SafetyForm } from '@/components/Safety/SafetyForm';
import { SafetyIncidentForm } from '@/components/Safety/SafetyIncidentForm';
import { ToolboxTalkForm } from '@/components/Safety/ToolboxTalkForm';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreateInspection,
  useCreateSafetyForm,
  useCreateSafetyIncident,
  useCreateToolboxTalk,
  useInspections,
  useSafetyForms,
  useSafetyIncidents,
  useToolboxTalks,
} from '@/hooks/useSafety';

const SEVERITY_VARIANT = {
  low: 'secondary',
  medium: 'outline',
  high: 'destructive',
  critical: 'destructive',
} as const;

type SafetyFormItem = { id: string; form_type: string; form_date: string; state: string };
type Incident = {
  id: string;
  summary: string;
  incident_date: string;
  severity: keyof typeof SEVERITY_VARIANT;
  closed_at?: string | null;
};
type Talk = { id: string; topic: string; talk_date: string; attendee_count: number };
type Inspection = { id: string; inspection_type: string; inspection_date: string; state: string };

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

function FormsTab({
  forms,
  loading,
  onCreate,
}: {
  forms: SafetyFormItem[];
  loading: boolean;
  onCreate: (v: unknown) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate, isPending } = useCreateSafetyForm(forms[0]?.id ? '' : '');
  void mutate;
  void isPending;
  return (
    <TabsContent value="forms" className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
  );
}

function IncidentsTab({
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

function TalksTab({
  talks,
  loading,
  onCreate,
}: {
  talks: Talk[];
  loading: boolean;
  onCreate: (v: unknown) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <TabsContent value="talks" className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
  );
}

function InspectionsTab({
  inspections,
  loading,
  onCreate,
}: {
  inspections: Inspection[];
  loading: boolean;
  onCreate: (v: unknown) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <TabsContent value="inspections" className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
  );
}

export default function ProjectSafetyPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { data: formsRes, isLoading: loadingForms } = useSafetyForms(projectId);
  const { data: incidentsRes, isLoading: loadingIncidents } = useSafetyIncidents(projectId);
  const { data: talksRes, isLoading: loadingTalks } = useToolboxTalks(projectId);
  const { data: inspectionsRes, isLoading: loadingInspections } = useInspections(projectId);

  const createForm = useCreateSafetyForm(projectId);
  const createIncident = useCreateSafetyIncident(projectId);
  const createTalk = useCreateToolboxTalk(projectId);
  const createInspection = useCreateInspection(projectId);

  const forms = formsRes ? formsRes.data || [] : [];
  const incidents = incidentsRes ? incidentsRes.data || [] : [];
  const talks = talksRes ? talksRes.data || [] : [];
  const inspections = inspectionsRes ? inspectionsRes.data || [] : [];
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
        <FormsTab
          forms={forms as SafetyFormItem[]}
          loading={loadingForms}
          onCreate={(v) => createForm.mutate(v as Parameters<typeof createForm.mutate>[0])}
        />
        <IncidentsTab
          incidents={incidents as Incident[]}
          loading={loadingIncidents}
          onCreate={(v) => createIncident.mutate(v as Parameters<typeof createIncident.mutate>[0])}
        />
        <TalksTab
          talks={talks as Talk[]}
          loading={loadingTalks}
          onCreate={(v) => createTalk.mutate(v as Parameters<typeof createTalk.mutate>[0])}
        />
        <InspectionsTab
          inspections={inspections as Inspection[]}
          loading={loadingInspections}
          onCreate={(v) =>
            createInspection.mutate(v as Parameters<typeof createInspection.mutate>[0])
          }
        />
      </Tabs>
    </div>
  );
}
