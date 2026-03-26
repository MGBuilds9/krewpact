'use client';

import { FileUp, Loader2, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateTakeoffJob } from '@/hooks/useTakeoff';

interface TakeoffUploadDialogProps {
  estimateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated: (jobId: string) => void;
}

const MAX_FILES = 5;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TakeoffUploadDialog({
  estimateId,
  open,
  onOpenChange,
  onJobCreated,
}: TakeoffUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createJob = useCreateTakeoffJob();

  const validateAndAddFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const newFiles = Array.from(incoming).filter((f) => f.type === 'application/pdf');

      if (newFiles.length !== Array.from(incoming).length) {
        setError('Only PDF files are accepted.');
        return;
      }

      const oversized = newFiles.find((f) => f.size > MAX_SIZE);
      if (oversized) {
        setError(`${oversized.name} exceeds 50MB limit.`);
        return;
      }

      const combined = [...files, ...newFiles];
      if (combined.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed.`);
        return;
      }

      setFiles(combined);
    },
    [files],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        validateAndAddFiles(e.dataTransfer.files);
      }
    },
    [validateAndAddFiles],
  );

  const handleSubmit = async () => {
    if (files.length === 0) return;
    try {
      const result = await createJob.mutateAsync({ estimateId, files });
      setFiles([]);
      onOpenChange(false);
      onJobCreated(result.id);
    } catch {
      setError('Failed to create takeoff job. Please try again.');
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !createJob.isPending) {
      setFiles([]);
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Takeoff</DialogTitle>
          <DialogDescription>
            Upload construction plan PDFs. The engine will classify pages, extract quantities, and
            generate draft line items for your review.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Drop PDF files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">
            Up to {MAX_FILES} files, {formatFileSize(MAX_SIZE)} each
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) validateAndAddFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`${file.name}-${i}`}
                className="flex items-center justify-between text-sm border rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-muted-foreground flex-shrink-0">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={createJob.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={files.length === 0 || createJob.isPending}>
            {createJob.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              `Start Takeoff (${files.length} file${files.length !== 1 ? 's' : ''})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
