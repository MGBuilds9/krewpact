'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getDivisionFilter, useDivision } from '@/contexts/DivisionContext';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useProjects } from '@/hooks/useProjects';
import { useCreateReport } from '@/hooks/useReports';

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
export default function NewReportPage() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision } = useDivision();
  const divId = getDivisionFilter(activeDivision);
  const { data: projects } = useProjects({ divisionId: divId });
  const createReport = useCreateReport();

  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectId, setProjectId] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [crewCount, setCrewCount] = useState('');
  const [delays, setDelays] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!projectId) {
      toast.error('Please select a project');
      return;
    }
    setIsSubmitting(true);
    try {
      await createReport.mutateAsync({
        project_id: projectId,
        log_date: logDate,
        work_summary: workSummary || undefined,
        crew_count: crewCount ? parseInt(crewCount, 10) : undefined,
        delays: delays || undefined,
        safety_notes: safetyNotes || undefined,
      });
      toast.success('Daily log created');
      orgPush('/reports');
    } catch {
      toast.error('Failed to create daily log');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/reports')}
          aria-label="Back to reports"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Daily Log</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily Log Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Project *">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {(projects || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Log Date">
            <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          </FormField>
          <FormField label="Work Summary">
            <Textarea
              placeholder="Describe the work performed today..."
              className="min-h-[100px]"
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
            />
          </FormField>
          <FormField label="Crew Count">
            <Input
              type="number"
              placeholder="Number of workers on site"
              value={crewCount}
              onChange={(e) => setCrewCount(e.target.value)}
            />
          </FormField>
          <FormField label="Delays">
            <Textarea
              placeholder="Any delays or issues encountered..."
              value={delays}
              onChange={(e) => setDelays(e.target.value)}
            />
          </FormField>
          <FormField label="Safety Notes">
            <Textarea
              placeholder="Safety observations or incidents..."
              value={safetyNotes}
              onChange={(e) => setSafetyNotes(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => orgPush('/reports')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Daily Log'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
