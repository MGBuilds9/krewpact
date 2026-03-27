'use client';

import { FileImage, Loader2, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ReceiptFile {
  file: File;
  preview: string | null;
}

interface ReceiptUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  accept?: string;
  maxSizeMb?: number;
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface ReceiptDropZoneProps {
  dragOver: boolean;
  accept: string;
  maxSizeMb: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onFileChange: (files: FileList | null) => void;
}

function ReceiptDropZone({
  dragOver,
  accept,
  maxSizeMb,
  inputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileChange,
}: ReceiptDropZoneProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload receipt — drag and drop or click to select"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        dragOver
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30',
      )}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Drop receipt here or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">Images and PDFs up to {maxSizeMb} MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files)}
      />
    </div>
  );
}

function ReceiptPreview({
  pending,
  isUploading,
  onUpload,
  onRemove,
}: {
  pending: ReceiptFile;
  isUploading: boolean;
  onUpload: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      {pending.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pending.preview}
          alt="Receipt preview"
          className="h-14 w-14 rounded object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded bg-muted">
          <FileImage className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{pending.file.name}</p>
        <p className="text-xs text-muted-foreground">{(pending.file.size / 1024).toFixed(0)} KB</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onUpload} disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Uploading…
            </>
          ) : (
            'Upload'
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          disabled={isUploading}
          aria-label="Remove selected file"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ReceiptUpload({
  onUpload,
  isUploading = false,
  accept = 'image/*,application/pdf',
  maxSizeMb = 10,
  className,
}: ReceiptUploadProps) {
  const [pending, setPending] = useState<ReceiptFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    if (file.size > maxSizeMb * 1024 * 1024) return `File exceeds ${maxSizeMb} MB limit.`;
    const allowed = accept.split(',').map((s) => s.trim());
    const typeOk = allowed.some((p) =>
      p.endsWith('/*')
        ? file.type.startsWith(p.replace('/*', '/'))
        : file.type === p || file.name.endsWith(p.replace('*', '')),
    );
    return typeOk ? null : 'File type not supported. Upload an image or PDF.';
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (pending?.preview) URL.revokeObjectURL(pending.preview);
    setPending({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    });
  }

   
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  async function handleUpload() {
    if (!pending) return;
    await onUpload(pending.file);
    if (pending.preview) URL.revokeObjectURL(pending.preview);
    setPending(null);
  }

  function handleRemove() {
    if (pending?.preview) URL.revokeObjectURL(pending.preview);
    setPending(null);
    setError(null);
  }

  return (
    <div className={cn('space-y-3', className)}>
      {!pending && (
        <ReceiptDropZone
          dragOver={dragOver}
          accept={accept}
          maxSizeMb={maxSizeMb}
          inputRef={inputRef}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onFileChange={handleFiles}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {pending && (
        <ReceiptPreview
          pending={pending}
          isUploading={isUploading}
          onUpload={handleUpload}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}
