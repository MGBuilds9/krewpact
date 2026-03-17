'use client';

import { useState } from 'react';

import { StagingReviewPanel } from '@/components/Executive/StagingReviewPanel';
import { StagingTable } from '@/components/Executive/StagingTable';

export default function KnowledgeIngestPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  return (
    <>
      <title>Knowledge Ingestion — KrewPact</title>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Document Queue</h2>
          <StagingTable onSelect={(doc) => setSelectedId(doc.id)} selectedId={selectedId} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Review</h2>
          {selectedId ? (
            <StagingReviewPanel docId={selectedId} />
          ) : (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              Select a document to review
            </div>
          )}
        </div>
      </div>
    </>
  );
}
