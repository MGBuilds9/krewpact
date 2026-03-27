'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, RefreshCw, ShieldAlert, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createBrowserClient } from '@/lib/supabase/client';

interface ComplianceDoc {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  meta: {
    expiry_date?: string;
    doc_category: string;
    trade_portal_id: string;
  };
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  data: ComplianceDoc[];
  total: number;
}

function expiryStatus(expiryDate?: string): 'expired' | 'expiring-soon' | 'valid' | 'none' {
  if (!expiryDate) return 'none';
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'expiring-soon';
  return 'valid';
}

const STATUS_MAP = {
  expired: { label: 'Expired', className: 'bg-red-100 text-red-700 border-red-200' },
  'expiring-soon': {
    label: 'Expiring Soon',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  valid: { label: 'Valid', className: 'bg-green-100 text-green-700 border-green-200' },
  none: { label: 'No Expiry', className: 'bg-gray-100 text-gray-600 border-gray-200' },
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocCard({ doc }: { doc: ComplianceDoc }) {
  const status = expiryStatus(doc.meta.expiry_date);
  const { label, className } = STATUS_MAP[status];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-start gap-3">
      <FileText className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{doc.file_name}</p>
          <Badge className={`text-xs border shrink-0 ${className}`}>{label}</Badge>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {doc.file_type.toUpperCase()} &middot; {formatBytes(doc.file_size_bytes)}
        </p>
        {doc.meta.expiry_date && (
          <p className="text-xs text-gray-500 mt-0.5">
            Expires:{' '}
            {new Date(doc.meta.expiry_date).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
          </p>
        )}
      </div>
    </div>
  );
}

function ComplianceSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function TradeCompliancePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ['portal-trade-compliance'],
    queryFn: async () => {
      const res = await fetch('/api/portal/trade/compliance');
      if (!res.ok) throw new Error('Failed to load compliance documents');
      return res.json() as Promise<ApiResponse>;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const supabase = createBrowserClient();
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `compliance/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error } = await supabase.storage
        .from('portal-compliance')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setUploadError(null);
      void queryClient.invalidateQueries({ queryKey: ['portal-trade-compliance'] });
    },
    onError: (err: Error) => {
      setUploadError(err.message);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    uploadMutation.mutate(file);
    e.target.value = '';
  }

  const docs = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Compliance Documents</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Insurance certificates, WSIB clearances, and certifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <span className="text-sm text-gray-500">
              {total} document{total !== 1 ? 's' : ''}
            </span>
          )}
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {uploadMutation.isPending ? 'Uploading…' : 'Upload Document'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Upload compliance document"
          />
        </div>
      </div>

      {uploadError && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"
          role="alert"
        >
          Upload failed: {uploadError}
        </div>
      )}

      {uploadMutation.isSuccess && (
        <div
          className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700"
          role="status"
        >
          Document uploaded successfully.
        </div>
      )}

      {isError && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3"
          role="alert"
        >
          <div className="flex items-center gap-2 text-sm text-red-700">
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Failed to load compliance documents.
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <ComplianceSkeleton />
      ) : docs.length === 0 && !isError ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-3">
          <FileText className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm">No compliance documents on file yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
