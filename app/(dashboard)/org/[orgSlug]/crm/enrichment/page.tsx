'use client';

import { EnrichmentDashboard } from '@/components/CRM/EnrichmentDashboard';

export default function EnrichmentPage() {
  return (
    <>
      <title>Enrichment — KrewPact CRM</title>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Enrichment Management</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage lead enrichment jobs across all data sources.
          </p>
        </div>
        <EnrichmentDashboard />
      </div>
    </>
  );
}
