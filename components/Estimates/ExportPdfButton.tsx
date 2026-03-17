'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { EstimatePdfData } from '@/lib/pdf/types';

interface ExportPdfButtonProps {
  estimateNumber: string;
  estimateData: EstimatePdfData;
}

export function ExportPdfButton({ estimateNumber, estimateData }: ExportPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleExport() {
    setIsLoading(true);

    try {
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'estimate',
          data: estimateData,
        }),
      });

      if (!response.ok) {
        toast({
          title: 'Export failed',
          description: 'Could not generate the PDF. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const blob = await response.blob();
      const date = new Date().toISOString().split('T')[0];
      const filename = `Estimate-${estimateNumber}-${date}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: 'Export failed',
        description: 'A network error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-1" />
          Export PDF
        </>
      )}
    </Button>
  );
}
