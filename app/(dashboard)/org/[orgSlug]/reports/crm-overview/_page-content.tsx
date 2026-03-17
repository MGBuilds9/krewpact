'use client';

import { BarChart3 } from 'lucide-react';

import { CRMOverviewReport } from '@/components/CRM/CRMOverviewReport';

export default function CRMOverviewReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CRM Overview Report</h2>
          <p className="text-muted-foreground">
            Unified view of leads, pipeline, activity, and bidding performance
          </p>
        </div>
      </div>

      <CRMOverviewReport />
    </div>
  );
}
