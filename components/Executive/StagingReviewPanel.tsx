'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Pencil, ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StagingDocDetail {
  id: string;
  title: string;
  source_path: string | null;
  source_type: string;
  category: string | null;
  status: string;
  tags: string[];
  content: string | null;
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface PatchPayload {
  status?: string;
  category?: string | null;
  content?: string;
  review_notes?: string;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_review: 'border-yellow-400 text-yellow-700 bg-yellow-50',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  needs_edit: 'bg-orange-100 text-orange-800 border-orange-300',
  ingested: 'bg-blue-100 text-blue-800 border-blue-300',
};

const CATEGORIES = [
  'policy',
  'procedure',
  'contract',
  'financial',
  'hr',
  'technical',
  'legal',
  'other',
];

interface StagingReviewPanelProps {
  docId: string;
}

export function StagingReviewPanel({ docId }: StagingReviewPanelProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const {
    data: doc,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.executive.staging.detail(docId),
    queryFn: () => apiFetch<StagingDocDetail>(`/api/executive/staging/${docId}`),
    select(d) {
      // Initialise local state on first load
      setEditedContent((prev) => (prev === '' ? (d.content ?? '') : prev));
      setReviewNotes((prev) => (prev === '' ? (d.review_notes ?? '') : prev));
      setSelectedCategory((prev) => (prev === '' ? (d.category ?? '') : prev));
      return d;
    },
  });

  const { mutate: patch, isPending } = useMutation({
    mutationFn: (payload: PatchPayload) =>
      apiFetch<StagingDocDetail>(`/api/executive/staging/${docId}`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.executive.staging.all });
      if (variables.status === 'approved') showToast.success('Document approved');
      else if (variables.status === 'rejected') showToast.success('Document rejected');
      else showToast.success('Changes saved');
      setIsEditing(false);
    },
    onError: () => {
      showToast.error('Failed to update document');
    },
  });

  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="border rounded-lg p-8 text-center text-destructive flex flex-col items-center gap-2">
        <ShieldAlert className="h-8 w-8" />
        <p className="text-sm">Failed to load document.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-base leading-snug">{doc.title}</h3>
        <Badge
          variant="outline"
          className={`shrink-0 text-xs ${STATUS_BADGE_CLASSES[doc.status] ?? ''}`}
        >
          {doc.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Source path */}
      {doc.source_path && (
        <p className="text-xs font-mono text-muted-foreground break-all">{doc.source_path}</p>
      )}

      {/* Category selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground shrink-0">Category</span>
        <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isPending}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content viewer / editor */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Content</p>
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="font-mono text-xs min-h-[300px] max-h-[500px] resize-y"
            disabled={isPending}
          />
        ) : (
          <pre className="text-xs font-mono bg-muted/40 rounded-md p-4 overflow-auto max-h-[500px] whitespace-pre-wrap break-words">
            {doc.content ?? <span className="text-muted-foreground italic">No content</span>}
          </pre>
        )}
      </div>

      {/* Review notes */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Review Notes</p>
        <Textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="Add review notes..."
          className="text-sm min-h-[80px] resize-y"
          disabled={isPending}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
          disabled={isPending}
          onClick={() =>
            patch({
              status: 'approved',
              category: selectedCategory || null,
              review_notes: reviewNotes,
            })
          }
        >
          <CheckCircle className="h-4 w-4" />
          Approve
        </Button>

        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5"
          disabled={isPending}
          onClick={() =>
            patch({
              status: 'rejected',
              category: selectedCategory || null,
              review_notes: reviewNotes,
            })
          }
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={isPending}
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
            } else {
              setEditedContent(doc.content ?? '');
              setIsEditing(true);
            }
          }}
        >
          <Pencil className="h-4 w-4" />
          {isEditing ? 'Cancel Edit' : 'Edit'}
        </Button>

        {isEditing && (
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              patch({
                status: 'needs_edit',
                content: editedContent,
                category: selectedCategory || null,
                review_notes: reviewNotes,
              })
            }
          >
            Save Edits
          </Button>
        )}
      </div>
    </div>
  );
}
