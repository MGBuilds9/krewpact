'use client';

import { useParams } from 'next/navigation';

import { usePortalDocuments, type PortalDocument } from '@/hooks/usePortalProject';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentRow({ doc }: { doc: PortalDocument }) {
  const ext = doc.file_name.split('.').pop()?.toUpperCase() ?? 'FILE';
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {ext}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
          <p className="text-xs text-gray-400">
            {formatBytes(doc.file_size_bytes)} &middot;{' '}
            {new Date(doc.created_at).toLocaleDateString('en-CA')}
          </p>
        </div>
      </div>
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

export default function DocumentsPageContent() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data, loading, error } = usePortalDocuments(projectId);

  const docs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
        {data && (
          <span className="text-sm text-gray-500">
            {data.total} file{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {loading && <DocumentsSkeleton />}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {!loading && !error && docs.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          No documents have been shared for this project yet.
        </div>
      )}
      {!loading && !error && docs.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          {docs.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
