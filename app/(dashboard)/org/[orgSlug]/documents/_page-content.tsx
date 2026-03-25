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
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivision } from '@/contexts/DivisionContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCreateFolder, useDeleteFile, useFiles, useFolders } from '@/hooks/useDocuments';
import { useProjects } from '@/hooks/useProjects';
import { formatStatus } from '@/lib/format-status';

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

type Project = NonNullable<ReturnType<typeof useProjects>['data']>[number];
type FolderItem = NonNullable<ReturnType<typeof useFolders>['data']>['data'][number];
type FileItem = NonNullable<ReturnType<typeof useFiles>['data']>['data'][number];

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  debouncedSearch: string;
  onSelect: (id: string) => void;
}
function ProjectListView({ projects, loading, debouncedSearch, onSelect }: ProjectListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => (
          <Skeleton key={id} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {debouncedSearch
              ? `No projects match "${debouncedSearch}"`
              : 'Create a project to start managing documents'}
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect(project.id)}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{project.project_name}</h3>
                  <p className="text-xs text-muted-foreground">{project.project_number}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-3">
              <Badge variant="outline" className="text-xs capitalize">
                {formatStatus(project.status)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
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

interface FileBrowserProps {
  selectedProject: Project | undefined;
  currentFolders: FolderItem[];
  files: FileItem[];
  folders: FolderItem[];
  selectedFolderId: string | undefined;
  debouncedSearch: string;
  showNewFolder: boolean;
  newFolderName: string;
  createFolderPending: boolean;
  setSelectedFolderId: (id: string | undefined) => void;
  setSelectedProjectId: (id: string | null) => void;
  setShowNewFolder: (v: boolean) => void;
  setNewFolderName: (v: string) => void;
  setSearch: (v: string) => void;
  handleCreateFolder: () => void;
  handleDeleteFile: (id: string) => void;
}

function FileBrowserView({
  selectedProject,
  currentFolders,
  files,
  folders,
  selectedFolderId,
  debouncedSearch,
  showNewFolder,
  newFolderName,
  createFolderPending,
  setSelectedFolderId,
  setSelectedProjectId,
  setShowNewFolder,
  setNewFolderName,
  setSearch,
  handleCreateFolder,
  handleDeleteFile,
}: FileBrowserProps) {
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
        <Button size="sm" disabled>
          <Upload className="h-4 w-4 mr-1" />
          Upload
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
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

export default function DocumentsPage() {
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useProjects({
    divisionId: activeDivision?.id,
  });
  const { data: foldersResponse } = useFolders(selectedProjectId ?? '');
  const { data: filesResponse } = useFiles(selectedProjectId ?? '', selectedFolderId);
  const createFolder = useCreateFolder(selectedProjectId ?? '');
  const deleteFile = useDeleteFile(selectedProjectId ?? '');

  const folders = foldersResponse?.data ?? [];
  const files = filesResponse?.data ?? [];
  const filteredProjects = projects.filter(
    (p) =>
      !debouncedSearch ||
      p.project_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.project_number.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const currentFolders = folders.filter((f) => f.parent_folder_id === (selectedFolderId ?? null));

  async function handleCreateFolder() {
    if (!newFolderName.trim() || !selectedProjectId) return;
    try {
      await createFolder.mutateAsync({
        project_id: selectedProjectId,
        folder_name: newFolderName.trim(),
        folder_path: `/${newFolderName.trim()}`,
        parent_folder_id: selectedFolderId ?? null,
      });
      setNewFolderName('');
      setShowNewFolder(false);
    } catch {
      /* handled by React Query */
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    try {
      await deleteFile.mutateAsync(fileId);
    } catch {
      /* handled by React Query */
    }
  }

  return (
    <>
      <title>Documents — KrewPact</title>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
              <p className="text-muted-foreground">Browse and manage project files</p>
            </div>
          </div>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={selectedProjectId ? 'Search files...' : 'Search projects...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {!selectedProjectId ? (
          <ProjectListView
            projects={filteredProjects}
            loading={projectsLoading}
            debouncedSearch={debouncedSearch}
            onSelect={(id) => {
              setSelectedProjectId(id);
              setSelectedFolderId(undefined);
              setSearch('');
            }}
          />
        ) : (
          <FileBrowserView
            selectedProject={selectedProject}
            currentFolders={currentFolders}
            files={files}
            folders={folders}
            selectedFolderId={selectedFolderId}
            debouncedSearch={debouncedSearch}
            showNewFolder={showNewFolder}
            newFolderName={newFolderName}
            createFolderPending={createFolder.isPending}
            setSelectedFolderId={setSelectedFolderId}
            setSelectedProjectId={setSelectedProjectId}
            setShowNewFolder={setShowNewFolder}
            setNewFolderName={setNewFolderName}
            setSearch={setSearch}
            handleCreateFolder={handleCreateFolder}
            handleDeleteFile={handleDeleteFile}
          />
        )}
      </div>
    </>
  );
}
