'use client';

import {
  ArrowLeft,
  ChevronRight,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { useFiles, useFolders } from '@/hooks/useDocuments';
import type { useProjects } from '@/hooks/useProjects';

type Project = NonNullable<ReturnType<typeof useProjects>['data']>[number];
type FolderItem = NonNullable<ReturnType<typeof useFolders>['data']>['data'][number];
type FileItem = NonNullable<ReturnType<typeof useFiles>['data']>['data'][number];

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return FileSpreadsheet;
  if (mimeType.includes('pdf')) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface NewFolderFormProps {
  name: string;
  pending: boolean;
  onChange: (v: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

function NewFolderForm({ name, pending, onChange, onCreate, onCancel }: NewFolderFormProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Folder className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Folder name"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCreate();
            if (e.key === 'Escape') onCancel();
          }}
        />
        <Button size="sm" onClick={onCreate} disabled={!name.trim() || pending}>
          Create
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}

interface FileBrowserViewProps {
  selectedProject: Project | undefined;
  currentFolders: FolderItem[];
  files: FileItem[];
  folders: FolderItem[];
  selectedFolderId: string | undefined;
  debouncedSearch: string;
  showNewFolder: boolean;
  newFolderName: string;
  createFolderPending: boolean;
  uploadPending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setSelectedFolderId: (id: string | undefined) => void;
  setSelectedProjectId: (id: string | null) => void;
  setShowNewFolder: (v: boolean) => void;
  setNewFolderName: (v: string) => void;
  setSearch: (v: string) => void;
  handleCreateFolder: () => void;
  handleDeleteFile: (id: string) => void;
  handleDownloadFile: (file: FileItem) => void;
}

// eslint-disable-next-line max-lines-per-function
export function FileBrowserView({
  selectedProject,
  currentFolders,
  files,
  folders,
  selectedFolderId,
  debouncedSearch,
  showNewFolder,
  newFolderName,
  createFolderPending,
  uploadPending,
  fileInputRef,
  setSelectedFolderId,
  setSelectedProjectId,
  setShowNewFolder,
  setNewFolderName,
  setSearch,
  handleCreateFolder,
  handleDeleteFile,
  handleDownloadFile,
}: FileBrowserViewProps) {
  const goBack = () => {
    if (selectedFolderId) {
      const cur = folders.find((f) => f.id === selectedFolderId);
      setSelectedFolderId(cur?.parent_folder_id ?? undefined);
    } else {
      setSelectedProjectId(null);
    }
  };
  const filteredFiles = files.filter(
    (f) =>
      !debouncedSearch || f.original_filename.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setSelectedFolderId(undefined);
            setSearch('');
          }}
          className="text-primary hover:underline"
        >
          Projects
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setSelectedFolderId(undefined)}
          className={selectedFolderId ? 'text-primary hover:underline' : 'font-medium'}
        >
          {selectedProject?.project_name}
        </button>
        {selectedFolderId && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {folders.find((f) => f.id === selectedFolderId)?.folder_name ?? 'Folder'}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Folder
        </Button>
        <Button size="sm" disabled={uploadPending} onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" />
          {uploadPending ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
      {showNewFolder && (
        <NewFolderForm
          name={newFolderName}
          pending={createFolderPending}
          onChange={setNewFolderName}
          onCreate={handleCreateFolder}
          onCancel={() => {
            setShowNewFolder(false);
            setNewFolderName('');
          }}
        />
      )}
      {currentFolders.length > 0 && (
        <div className="space-y-1">
          {currentFolders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => setSelectedFolderId(folder.id)}
            >
              <Folder className="h-5 w-5 text-amber-500" />
              <span className="font-medium text-sm flex-1">{folder.folder_name}</span>
              {folder.visibility && (
                <Badge variant="outline" className="text-xs">
                  {folder.visibility}
                </Badge>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      {filteredFiles.length > 0 ? (
        <div className="space-y-1">
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.mime_type);
            const ext = file.mime_type ? file.mime_type.split('/')[1] : null;
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.original_filename}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file_size_bytes)}</span>
                    <span>
                      {new Date(file.created_at).toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {ext && <span>{ext}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownloadFile(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteFile(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : currentFolders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Empty folder</h3>
            <p className="text-muted-foreground text-sm">
              Upload files or create subfolders to organize your documents.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
