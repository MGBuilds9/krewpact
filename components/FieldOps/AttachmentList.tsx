'use client';

import { Download, FileText, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteAttachment } from '@/hooks/useDocumentControl';
import type { Attachment } from '@/lib/validators/document-control';

interface AttachmentWithUrl extends Attachment {
  downloadUrl: string;
}

interface AttachmentListProps {
  entityType: 'rfi' | 'submittal';
  projectId: string;
  entityId: string;
  attachments: AttachmentWithUrl[];
  isLoading: boolean;
  canDelete?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  entityType,
  projectId,
  entityId,
  attachments,
  isLoading,
  canDelete = true,
}: AttachmentListProps) {
  const deleteMutation = useDeleteAttachment(entityType, projectId, entityId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {['al-1', 'al-2'].map((k) => (
          <Skeleton key={k} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm">No attachments yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border">
      {attachments.map((a) => (
        <li key={a.id} className="flex items-center gap-3 px-3 py-2">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{a.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(a.size_bytes)} &middot;{' '}
              {new Date(a.created_at).toLocaleDateString('en-CA')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <a href={a.downloadUrl} download={a.file_name} aria-label={`Download ${a.file_name}`}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(a.id)}
                aria-label={`Delete ${a.file_name}`}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
