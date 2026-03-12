'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import SLAConfigForm from '@/components/CRM/SLAConfigForm';

export default function SLASettingsPage() {
  const { push: orgPush } = useOrgRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/crm/settings')}
          aria-label="Back to CRM settings"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Clock className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SLA Configuration</h2>
          <p className="text-muted-foreground">
            Set maximum time allowed in each pipeline stage before overdue alerts trigger.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stage SLA Deadlines</CardTitle>
          <CardDescription>
            Configure the maximum hours allowed in each stage for leads and opportunities. Items
            exceeding these thresholds will be flagged as overdue in dashboards and reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SLAConfigForm />
        </CardContent>
      </Card>
    </div>
  );
}
