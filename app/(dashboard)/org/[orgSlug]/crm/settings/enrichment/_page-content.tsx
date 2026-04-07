'use client';

import { EnrichmentConfigPanel } from '@/components/CRM/EnrichmentConfigPanel';

export default function EnrichmentSettingsPage() {
  return (
    <>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Enrichment Configuration</h1>
          <p className="text-muted-foreground">
            Configure which data sources are used for lead enrichment and their priority.
          </p>
        </div>
        <div className="max-w-lg">
          <EnrichmentConfigPanel />
        </div>
      </div>
    </>
  );
}
