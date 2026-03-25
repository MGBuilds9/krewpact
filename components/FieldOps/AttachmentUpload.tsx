'use client';

import { Loader2, Paperclip, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useUploadAttachment } from '@/hooks/useDocumentControl';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/validators/document-control';

interface AttachmentUploadProps {
  entityType: 'rfi' | 'submittal';
  projectId: string;
  entityId: string;
  onSuccess?: () => void;
}

const ACCEPTED = ALLOWED_MIME_TYPES.join(',');
const MAX_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);

export function AttachmentUpload({
  entityType,
  projectId,
  entityId,
  onSuccess,
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const uploadMutation = useUploadAttachment(entityType, projectId, entityId);

  function validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE_BYTES) return `File exceeds ${MAX_MB} MB limit`;
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      return 'File type not permitted (PDF, images, Word, Excel only)';
    }
    return null;
  }

  function handleFile(file: File) {
    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    uploadMutation.mutate(file, {
      onSuccess: () => {
        onSuccess?.();
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave() {
    setDragActive(false);
  }

  const isUploading = uploadMutation.isPending;
  const uploadError = uploadMutation.isError
    ? (uploadMutation.error as Error).message
    : null;

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload file — click or drag and drop"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50',
          isUploading ? 'pointer-events-none opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {isUploading ? 'Uploading…' : 'Drag & drop a file or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, images, Word, Excel — max {MAX_MB} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={handleInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {(validationError ?? uploadError) && (
        <p className="text-sm text-destructive" role="alert">
          {validationError ?? uploadError}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="mr-2 h-4 w-4" />
        Choose file
      </Button>
    </div>
  );
}
