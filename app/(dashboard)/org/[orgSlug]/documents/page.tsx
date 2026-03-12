'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Upload,
  FolderOpen,
  Search,
  File,
  Image,
  FileSpreadsheet,
  ChevronRight,
  ArrowLeft,
  Download,
  Trash2,
  Folder,
  Plus,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useFolders, useFiles, useCreateFolder, useDeleteFile } from '@/hooks/useDocuments';
import { useDivision } from '@/contexts/DivisionContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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

  // Filter projects by search
  const filteredProjects = projects.filter(
    (p) =>
      !debouncedSearch ||
      p.project_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.project_number.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Filter folders at current level
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
      // handled by React Query
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    try {
      await deleteFile.mutateAsync(fileId);
    } catch {
      // handled by React Query
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

        {/* Search */}
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
          // Project List View
          <>
            {projectsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setSelectedFolderId(undefined);
                      setSearch('');
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <FolderOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">
                              {project.project_name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {project.project_number}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="mt-3">
                        <Badge variant="outline" className="text-xs capitalize">
                          {project.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          // File Browser View
          <div className="space-y-4">
            {/* Breadcrumb */}
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

            {/* Actions Bar */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedFolderId) {
                    // Go up one level
                    const currentFolder = folders.find((f) => f.id === selectedFolderId);
                    setSelectedFolderId(currentFolder?.parent_folder_id ?? undefined);
                  } else {
                    setSelectedProjectId(null);
                  }
                }}
              >
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

            {/* New Folder Form */}
            {showNewFolder && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Folder className="h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') {
                        setShowNewFolder(false);
                        setNewFolderName('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || createFolder.isPending}
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewFolder(false);
                      setNewFolderName('');
                    }}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Folders */}
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

            {/* Files */}
            {files.length > 0 ? (
              <div className="space-y-1">
                {files
                  .filter(
                    (f) =>
                      !debouncedSearch ||
                      f.original_filename.toLowerCase().includes(debouncedSearch.toLowerCase()),
                  )
                  .map((file) => {
                    const Icon = getFileIcon(file.mime_type);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                      >
                        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
                            {file.mime_type && <span>{file.mime_type.split('/')[1]}</span>}
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
        )}
      </div>
    </>
  );
}
