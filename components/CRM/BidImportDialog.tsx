'use client';

import { AlertCircle, Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useImportBidding } from '@/hooks/useCRM';

interface ParsedBid {
  title: string;
  source?: string;
  url?: string;
  deadline?: string;
  estimated_value?: number;
  notes?: string;
}

interface BidImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseCsv(text: string): ParsedBid[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return {
      title: row['title'] ?? '',
      source: row['source'] || undefined,
      url: row['url'] || undefined,
      deadline: row['deadline'] || undefined,
      estimated_value: row['estimated_value'] ? Number(row['estimated_value']) : undefined,
      notes: row['notes'] || undefined,
    };
  });
}

function parseJson(text: string): ParsedBid[] {
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) return parsed as ParsedBid[];
  if (typeof parsed === 'object' && parsed !== null && 'items' in parsed) {
    return (parsed as { items: ParsedBid[] }).items;
  }
  return [];
}

export function BidImportDialog({ open, onOpenChange }: BidImportDialogProps) {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<ParsedBid[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const importBidding = useImportBidding();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRaw(text);
      handleParse(text);
    };
    reader.readAsText(file);
  }

  function handleParse(text: string) {
    setParseError(null);
    try {
      const trimmed = text.trim();
      const bids = trimmed.startsWith('[') || trimmed.startsWith('{')
        ? parseJson(trimmed)
        : parseCsv(trimmed);
      const valid = bids.filter((b) => b.title?.trim());
      setPreview(valid);
      if (valid.length === 0) setParseError('No valid bids found. Ensure rows have a title column.');
    } catch {
      setParseError('Could not parse input. Provide valid CSV or JSON.');
      setPreview([]);
    }
  }

  async function handleImport() {
    if (preview.length === 0) return;
    await importBidding.mutateAsync({ items: preview as Parameters<typeof importBidding.mutateAsync>[0]['items'] });
    setRaw('');
    setPreview([]);
    onOpenChange(false);
  }

  function handleClose(v: boolean) {
    if (!v) { setRaw(''); setPreview([]); setParseError(null); }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Bids</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste JSON. CSV must have a <code>title</code> column. Optional
            columns: source, url, deadline, estimated_value, notes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              Upload CSV
              <input
                type="file"
                accept=".csv,.json"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
            <span className="text-sm text-muted-foreground">or paste below</span>
          </div>

          <Textarea
            placeholder={'title,source,estimated_value\n"New Bid",merx,50000'}
            rows={5}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />

          {parseError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{preview.length} bid(s) ready to import</p>
              <div className="rounded-md border overflow-auto max-h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((bid, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{bid.title}</TableCell>
                        <TableCell>{bid.source ?? '—'}</TableCell>
                        <TableCell>
                          {bid.estimated_value != null
                            ? new Intl.NumberFormat('en-CA', {
                                style: 'currency',
                                currency: 'CAD',
                                maximumFractionDigits: 0,
                              }).format(bid.estimated_value)
                            : '—'}
                        </TableCell>
                        <TableCell>{bid.deadline ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => handleParse(raw)} disabled={!raw.trim()}>
            Parse
          </Button>
          <Button
            onClick={handleImport}
            disabled={preview.length === 0 || importBidding.isPending}
          >
            {importBidding.isPending ? 'Importing…' : `Import ${preview.length} Bid(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
