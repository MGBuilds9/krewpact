'use client';

import { useState } from 'react';
import { KnowledgeSearch, type SearchResult } from '@/components/Executive/KnowledgeSearch';
import { DocumentViewer } from '@/components/Executive/DocumentViewer';

export default function KnowledgeLibraryPage() {
  const [selectedDoc, setSelectedDoc] = useState<SearchResult | null>(null);

  return (
    <>
      <title>Knowledge Base — KrewPact</title>
      <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-8rem)] gap-4 p-4">
        {/* Left pane: Search */}
        <div className="w-full md:w-1/3 min-w-0 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Knowledge Library</h2>
          <KnowledgeSearch onSelect={setSelectedDoc} />
        </div>

        {/* Right pane: Document Viewer or empty state */}
        <div className="w-full md:w-2/3 min-w-0">
          {selectedDoc ? (
            <DocumentViewer
              title={selectedDoc.title}
              category={selectedDoc.category}
              content={selectedDoc.content}
              similarity={selectedDoc.similarity}
              onClose={() => setSelectedDoc(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full border rounded-lg bg-muted/20">
              <div className="text-center text-muted-foreground">
                <p className="text-sm font-medium">No document selected</p>
                <p className="text-xs mt-1">Search and click a result to view its content</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
