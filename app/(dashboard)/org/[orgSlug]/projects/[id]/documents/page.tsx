'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FolderOpen, Plus, File, Folder, Share2 } from 'lucide-react';
import { useFolders, useFiles } from '@/hooks/useDocuments';
import { FolderManagementForm } from '@/components/Documents/FolderManagementForm';
import { FileMetadataForm } from '@/components/Documents/FileMetadataForm';
import { FileShareForm } from '@/components/Documents/FileShareForm';

export default function DocumentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);

  const { data: foldersData, isLoading: foldersLoading } = useFolders(projectId);
  const { data: filesData, isLoading: filesLoading } = useFiles(projectId, selectedFolderId);

  const folders = foldersData?.data ?? [];
  const files = filesData?.data ?? [];

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-sm text-muted-foreground">
              {filesData?.total ?? 0} files across {foldersData?.total ?? 0} folders
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Folder</DialogTitle>
              </DialogHeader>
              <FolderManagementForm
                projectId={projectId}
                parentFolderId={selectedFolderId}
                onSuccess={() => setNewFolderOpen(false)}
                onCancel={() => setNewFolderOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={newFileOpen} onOpenChange={setNewFileOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add File
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Register File</DialogTitle>
              </DialogHeader>
              <FileMetadataForm
                projectId={projectId}
                folderId={selectedFolderId}
                onSuccess={() => setNewFileOpen(false)}
                onCancel={() => setNewFileOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Folder sidebar */}
        <div className="col-span-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Folders
          </p>
          <button
            onClick={() => setSelectedFolderId(undefined)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
              !selectedFolderId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            All Files
          </button>
          {foldersLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            : folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    selectedFolderId === folder.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  {folder.folder_name}
                </button>
              ))}
        </div>

        {/* File table */}
        <div className="col-span-3">
          {filesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No files in this folder</p>
              <p className="text-sm">Add a file to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{file.filename}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{file.original_filename}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBytes(file.file_size_bytes)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{file.visibility ?? 'internal'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      v{file.version_no}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setShareFileId(file.id)}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Share dialog */}
      <Dialog open={!!shareFileId} onOpenChange={(o) => !o && setShareFileId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
          </DialogHeader>
          {shareFileId && (
            <FileShareForm
              projectId={projectId}
              fileId={shareFileId}
              onSuccess={() => setShareFileId(null)}
              onCancel={() => setShareFileId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
