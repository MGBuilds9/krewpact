'use client';

import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DocumentViewerProps {
  title: string | null;
  category: string | null;
  content: string;
  similarity?: number;
  onClose: () => void;
}

export function DocumentViewer({
  title,
  category,
  content,
  similarity,
  onClose,
}: DocumentViewerProps) {
  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b bg-muted/30 shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-base font-semibold truncate">{title ?? 'Untitled Document'}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            )}
            {similarity !== undefined && (
              <span className="text-xs text-muted-foreground">
                {Math.round(similarity * 100)}% match
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
          <span className="sr-only">Close document</span>
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
