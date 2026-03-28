'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Pencil, ShieldAlert, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import { formatStatus } from '@/lib/format-status';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/lib/toast';

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

function ActionButtons({
  isPending,
  isEditing,
  selectedCategory,
  reviewNotes,
  editedContent,
  onPatch,
  onToggleEdit,
}: {
  isPending: boolean;
  isEditing: boolean;
  selectedCategory: string;
  reviewNotes: string;
  editedContent: string;
  onPatch: (p: PatchPayload) => void;
  onToggleEdit: () => void;
}) {
  const base = { category: selectedCategory || null, review_notes: reviewNotes };
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
        disabled={isPending}
        onClick={() => onPatch({ status: 'approved', ...base })}
      >
        <CheckCircle className="h-4 w-4" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="gap-1.5"
        disabled={isPending}
        onClick={() => onPatch({ status: 'rejected', ...base })}
      >
        <XCircle className="h-4 w-4" />
        Reject
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={isPending}
        onClick={onToggleEdit}
      >
        <Pencil className="h-4 w-4" />
        {isEditing ? 'Cancel Edit' : 'Edit'}
      </Button>
      {isEditing && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => onPatch({ status: 'needs_edit', content: editedContent, ...base })}
        >
          Save Edits
        </Button>
      )}
    </div>
  );
}

function PanelContent({
  doc,
  isPending,
  isEditing,
  editedContent,
  reviewNotes,
  selectedCategory,
  setEditedContent,
  setReviewNotes,
  setSelectedCategory,
  setIsEditing,
  patch,
}: {
  doc: StagingDocDetail;
  isPending: boolean;
  isEditing: boolean;
  editedContent: string;
  reviewNotes: string;
  selectedCategory: string;
  setEditedContent: (v: string) => void;
  setReviewNotes: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  setIsEditing: (v: boolean) => void;
  patch: (p: PatchPayload) => void;
}) {
  return (
    <div className="border rounded-lg p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-base leading-snug">{doc.title}</h3>
        <Badge
          variant="outline"
          className={`shrink-0 text-xs ${STATUS_BADGE_CLASSES[doc.status] ?? ''}`}
        >
          {formatStatus(doc.status)}
        </Badge>
      </div>
      {doc.source_path && (
        <p className="text-xs font-mono text-muted-foreground break-all">{doc.source_path}</p>
      )}
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
      <ActionButtons
        isPending={isPending}
        isEditing={isEditing}
        selectedCategory={selectedCategory}
        reviewNotes={reviewNotes}
        editedContent={editedContent}
        onPatch={patch}
        onToggleEdit={() => {
          if (isEditing) {
            setIsEditing(false);
          } else {
            setEditedContent(doc.content ?? '');
            setIsEditing(true);
          }
        }}
      />
    </div>
  );
}

function StagingReviewPanelContent({ doc, docId }: { doc: StagingDocDetail; docId: string }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(doc.content ?? '');
  const [reviewNotes, setReviewNotes] = useState(doc.review_notes ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string>(doc.category ?? '');

  const { mutate: patch, isPending } = useMutation({
    mutationFn: (payload: PatchPayload) =>
      apiFetch<StagingDocDetail>(`/api/executive/staging/${docId}`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(queryKeys.executive.staging.detail(docId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.executive.staging.all });
      setEditedContent(updated.content ?? '');
      setReviewNotes(updated.review_notes ?? '');
      setSelectedCategory(updated.category ?? '');
      if (variables.status === 'approved') showToast.success('Document approved');
      else if (variables.status === 'rejected') showToast.success('Document rejected');
      else showToast.success('Changes saved');
      setIsEditing(false);
    },
    onError: () => showToast.error('Failed to update document'),
  });

  return (
    <PanelContent
      doc={doc}
      isPending={isPending}
      isEditing={isEditing}
      editedContent={editedContent}
      reviewNotes={reviewNotes}
      selectedCategory={selectedCategory}
      setEditedContent={setEditedContent}
      setReviewNotes={setReviewNotes}
      setSelectedCategory={setSelectedCategory}
      setIsEditing={setIsEditing}
      patch={patch}
    />
  );
}

export function StagingReviewPanel({ docId }: StagingReviewPanelProps) {
  const {
    data: doc,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.executive.staging.detail(docId),
    queryFn: () => apiFetch<StagingDocDetail>(`/api/executive/staging/${docId}`),
  });

  if (isLoading)
    return (
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError || !doc)
    return (
      <div className="border rounded-lg p-8 text-center text-destructive flex flex-col items-center gap-2">
        <ShieldAlert className="h-8 w-8" />
        <p className="text-sm">Failed to load document.</p>
      </div>
    );

  return <StagingReviewPanelContent key={doc.id} doc={doc} docId={docId} />;
}
