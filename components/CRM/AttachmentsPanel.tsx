'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AttachmentFile {
  name: string;
  path: string;
  size: number | null;
  created_at: string;
  public_url: string;
}

interface AttachmentsPanelProps {
  opportunityId: string;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileItem({ file, onDelete }: { file: AttachmentFile; onDelete: (name: string) => void }) {
  return (
    <li className="flex items-center justify-between rounded-md border p-2 text-sm">
      <div className="min-w-0 flex-1">
        <a
          href={file.public_url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-medium text-primary hover:underline"
        >
          {file.name}
        </a>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="ml-2 text-destructive hover:text-destructive"
        onClick={() => onDelete(file.name)}
      >
        Remove
      </Button>
    </li>
  );
}

export function AttachmentsPanel({ opportunityId }: AttachmentsPanelProps) {
  const [files, setFiles] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/opportunities/${opportunityId}/attachments`);
      if (!res.ok) throw new Error('Failed to load attachments');
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/crm/opportunities/${opportunityId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileName: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/crm/opportunities/${opportunityId}/attachments?fileName=${encodeURIComponent(fileName)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to delete file');
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Attachments
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              className="hidden"
              id="attachment-upload"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading attachments...</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => (
              <FileItem key={file.path} file={file} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
