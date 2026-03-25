'use client';

import { AlertTriangle, ClipboardList, Search, Users } from 'lucide-react';
import { useParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

import { FormsTab } from './_components/FormsTab';
import { IncidentsTab } from './_components/IncidentsTab';
import { InspectionsTab } from './_components/InspectionsTab';
import { TalksTab } from './_components/TalksTab';

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
          forms={forms}
          loading={loadingForms}
          onCreate={(v) => createForm.mutate(v as Parameters<typeof createForm.mutate>[0])}
        />
        <IncidentsTab
          incidents={incidents}
          loading={loadingIncidents}
          onCreate={(v) => createIncident.mutate(v as Parameters<typeof createIncident.mutate>[0])}
        />
        <TalksTab
          talks={talks}
          loading={loadingTalks}
          onCreate={(v) => createTalk.mutate(v as Parameters<typeof createTalk.mutate>[0])}
        />
        <InspectionsTab
          inspections={inspections}
          loading={loadingInspections}
          onCreate={(v) =>
            createInspection.mutate(v as Parameters<typeof createInspection.mutate>[0])
          }
        />
      </Tabs>
    </div>
  );
}
