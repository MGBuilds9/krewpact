'use client';

import { useUser } from '@clerk/nextjs';
import { FileText, Search } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { getDivisionFilter, useDivision } from '@/contexts/DivisionContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useCreateFolder,
  useDeleteFile,
  useDownloadFile,
  useFiles,
  useFolders,
  useUploadFile,
} from '@/hooks/useDocuments';
import { useProjects } from '@/hooks/useProjects';

import { FileBrowserView } from './_components/FileBrowserView';
import { ProjectListView } from './_components/ProjectListView';

type FileItem = NonNullable<ReturnType<typeof useFiles>['data']>['data'][number];

// eslint-disable-next-line max-lines-per-function, complexity
export default function DocumentsPage() {
  const { activeDivision } = useDivision();
  const { user } = useUser();
  const orgId = (user?.publicMetadata?.krewpact_org_id as string | undefined) ?? undefined;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useProjects({
    divisionId: getDivisionFilter(activeDivision),
  });
  const { data: foldersResponse } = useFolders(selectedProjectId ?? '');
  const { data: filesResponse } = useFiles(selectedProjectId ?? '', selectedFolderId);
  const createFolder = useCreateFolder(selectedProjectId ?? '');
  const deleteFile = useDeleteFile(selectedProjectId ?? '');
  const uploadFile = useUploadFile(selectedProjectId ?? '', selectedFolderId, orgId);
  const downloadFile = useDownloadFile();

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

  async function handleDelete(fileId: string) {
    try {
      await deleteFile.mutateAsync(fileId);
    } catch {
      /* handled by React Query */
    }
  }

  function handleDeleteFile(fileId: string) {
    setDeleteTarget(fileId);
  }

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    try {
      await uploadFile.mutateAsync(file);
    } catch {
      /* handled by React Query */
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDownloadFile(file: FileItem) {
    downloadFile.mutate({
      storageBucket: file.storage_bucket,
      filePath: file.file_path,
      originalFilename: file.original_filename,
    });
  }

  return (
    <>
      <title>Documents — KrewPact</title>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.dwg,.dxf,.zip"
        onChange={handleFileInputChange}
      />
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
            uploadPending={uploadFile.isPending}
            fileInputRef={fileInputRef}
            setSelectedFolderId={setSelectedFolderId}
            setSelectedProjectId={setSelectedProjectId}
            setShowNewFolder={setShowNewFolder}
            setNewFolderName={setNewFolderName}
            setSearch={setSearch}
            handleCreateFolder={handleCreateFolder}
            handleDeleteFile={handleDeleteFile}
            handleDownloadFile={handleDownloadFile}
          />
        )}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete(deleteTarget!);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
