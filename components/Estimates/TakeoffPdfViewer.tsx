'use client';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { Button } from '@/components/ui/button';

// Use local worker to avoid CSP issues with external CDN
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface TakeoffPdfViewerProps {
  url: string;
  activePage?: number;
  onPageChange?: (page: number) => void;
}

export function TakeoffPdfViewer({ url, activePage, onPageChange }: TakeoffPdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(activePage ?? 1);

  // When activePage prop changes, use it directly for rendering
  const displayPage = activePage ?? currentPage;

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, numPages));
    setCurrentPage(clamped);
    onPageChange?.(clamped);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToPage(displayPage - 1)}
          disabled={displayPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {displayPage} of {numPages || '...'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToPage(displayPage + 1)}
          disabled={displayPage >= numPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto flex justify-center bg-muted/30 p-4">
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div className="text-sm text-muted-foreground">Loading PDF...</div>}
          error={<div className="text-sm text-destructive">Failed to load PDF</div>}
        >
          <Page pageNumber={displayPage} width={600} />
        </Document>
      </div>
    </div>
  );
}
