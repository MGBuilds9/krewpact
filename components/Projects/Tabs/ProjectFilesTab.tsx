'use client';

import { FileText, FolderOpen, Trash2, Upload } from 'lucide-react';
import { useCallback, useRef } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOrg } from '@/contexts/OrgContext';
import { useDeleteFile, useFiles, useUploadFile } from '@/hooks/useDocuments';

interface ProjectFilesTabProps {
  projectId: string;
}

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const { data: filesData, isLoading } = useFiles(projectId);
  const upload = useUploadFile(projectId, undefined, orgId);
  const deleteFile = useDeleteFile(projectId);

  const files = filesData?.data ?? [];

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList?.length) return;
      for (const file of Array.from(fileList)) {
        await upload.mutateAsync(file);
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [upload],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Files</h2>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.zip"
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending || !orgId}
          >
            <Upload className="h-4 w-4 mr-2" />
            {upload.isPending ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </div>

      {upload.isError && (
        <p className="text-sm text-destructive">{upload.error.message}</p>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !files.length ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No files yet"
          description="Upload project documents, drawings, photos, and more. Max 50 MB per file."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.file_size_bytes
                          ? `${(file.file_size_bytes / 1024).toFixed(0)} KB`
                          : ''}
                        {file.created_at
                          ? ` · ${new Date(file.created_at).toLocaleDateString('en-CA')}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFile.mutate(file.id)}
                    disabled={deleteFile.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
