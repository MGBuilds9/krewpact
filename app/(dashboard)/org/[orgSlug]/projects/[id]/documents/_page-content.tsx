'use client';

import { File, Folder, FolderOpen, Plus, Share2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { FileMetadataForm } from '@/components/Documents/FileMetadataForm';
import { FileShareForm } from '@/components/Documents/FileShareForm';
import { FolderManagementForm } from '@/components/Documents/FolderManagementForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFiles, useFolders } from '@/hooks/useDocuments';

type FolderItem = { id: string; folder_name: string };
type FileItem = {
  id: string;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  visibility?: string | null;
  version_no: number;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function FolderSidebar({
  folders,
  foldersLoading,
  selectedFolderId,
  onSelect,
}: {
  folders: FolderItem[];
  foldersLoading: boolean;
  selectedFolderId: string | undefined;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <div className="col-span-1 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Folders
      </p>
      <button
        onClick={() => onSelect(undefined)}
        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${!selectedFolderId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
      >
        <FolderOpen className="h-4 w-4" />
        All Files
      </button>
      {foldersLoading
        ? ['f-1', 'f-2', 'f-3'].map((id) => <Skeleton key={id} className="h-9 w-full" />)
        : folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onSelect(folder.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${selectedFolderId === folder.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
            >
              <Folder className="h-4 w-4" />
              {folder.folder_name}
            </button>
          ))}
    </div>
  );
}

function FileTable({
  files,
  filesLoading,
  onShare,
}: {
  files: FileItem[];
  filesLoading: boolean;
  onShare: (id: string) => void;
}) {
  if (filesLoading) {
    return (
      <div className="space-y-2">
        {['r-1', 'r-2', 'r-3', 'r-4', 'r-5'].map((id) => (
          <Skeleton key={id} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <File className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No files in this folder</p>
        <p className="text-sm">Add a file to get started</p>
      </div>
    );
  }
  return (
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
              <Badge variant="outline">{file.visibility || 'internal'}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">v{file.version_no}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onShare(file.id)}>
                <Share2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// eslint-disable-next-line max-lines-per-function
export default function DocumentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);

  const { data: foldersData, isLoading: foldersLoading } = useFolders(projectId);
  const { data: filesData, isLoading: filesLoading } = useFiles(projectId, selectedFolderId);

  const folders = foldersData ? foldersData.data || [] : [];
  const files = filesData ? filesData.data || [] : [];
  const fileCount = filesData ? filesData.total || 0 : 0;
  const folderCount = foldersData ? foldersData.total || 0 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-sm text-muted-foreground">
              {fileCount} files across {folderCount} folders
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
        <FolderSidebar
          folders={folders as FolderItem[]}
          foldersLoading={foldersLoading}
          selectedFolderId={selectedFolderId}
          onSelect={setSelectedFolderId}
        />
        <div className="col-span-3">
          <FileTable
            files={files as FileItem[]}
            filesLoading={filesLoading}
            onShare={setShareFileId}
          />
        </div>
      </div>

      <Dialog
        open={!!shareFileId}
        onOpenChange={(o) => {
          if (!o) setShareFileId(null);
        }}
      >
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
