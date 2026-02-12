'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateReport, REPORT_TYPES } from '@/hooks/useReports';
import { useProjects } from '@/hooks/useProjects';
import { useDivision } from '@/contexts/DivisionContext';
import { toast } from 'sonner';

export default function NewReportPage() {
  const router = useRouter();
  const { activeDivision } = useDivision();
  const { data: projects } = useProjects({ divisionId: activeDivision?.id });
  const createReport = useCreateReport();

  const [reportType, setReportType] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType) {
      toast.error('Please select a report type');
      return;
    }
    setIsSubmitting(true);
    try {
      await createReport.mutateAsync({
        report_type: reportType,
        report_date: reportDate,
        project_id: projectId || undefined,
        division_id: activeDivision?.id,
        data: notes ? { notes } : undefined,
      });
      toast.success('Report created');
      router.push('/reports');
    } catch {
      toast.error('Failed to create report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/reports')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Report Type *</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Report Date</Label>
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Enter report details..."
              className="min-h-[150px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => router.push('/reports')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Report'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
