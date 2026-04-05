'use client';

import { ArrowRight, GitBranch, Merge, Tag, Trash2, Users, X } from 'lucide-react';
import { useState } from 'react';

import { SequenceEnrollDialog } from '@/components/CRM/SequenceEnrollDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamMembers } from '@/hooks/useTeam';
import { LEAD_PIPELINE_STAGES } from '@/lib/crm/lead-stages';

interface BulkActionBarProps {
  selectedIds: string[];
  entityType: 'lead' | 'contact' | 'account';
  onClearSelection: () => void;
  onActionComplete: () => void;
  onMerge?: () => void;
}

interface BulkActionDialogsProps {
  selectedIds: string[];
  entityType: 'lead' | 'contact' | 'account';
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (v: boolean) => void;
  tagDialogOpen: boolean;
  setTagDialogOpen: (v: boolean) => void;
  stageDialogOpen: boolean;
  setStageDialogOpen: (v: boolean) => void;
  assignDialogOpen: boolean;
  setAssignDialogOpen: (v: boolean) => void;
  enrollDialogOpen: boolean;
  setEnrollDialogOpen: (v: boolean) => void;
  executeBulk: (action: string, params?: Record<string, unknown>) => void;
  onActionComplete: () => void;
  onClearSelection: () => void;
}

function StageSelectDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (stage: string) => void;
}) {
  const [selected, setSelected] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Stage</DialogTitle>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Select a stage..." />
          </SelectTrigger>
          <SelectContent>
            {[...LEAD_PIPELINE_STAGES, { key: 'lost', label: 'Lost' }].map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onConfirm(selected);
                onOpenChange(false);
              }
            }}
          >
            Change Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (assigneeId: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const { data: members, isLoading } = useTeamMembers();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign To</DialogTitle>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Loading team…' : 'Select a team member…'} />
          </SelectTrigger>
          <SelectContent>
            {(members ?? []).map((m) => {
              const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email;
              return (
                <SelectItem key={m.id} value={m.id}>
                  {fullName} ({m.email})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onConfirm(selected);
                onOpenChange(false);
              }
            }}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkActionDialogs({
  selectedIds,
  entityType,
  deleteDialogOpen,
  setDeleteDialogOpen,
  tagDialogOpen,
  setTagDialogOpen,
  stageDialogOpen,
  setStageDialogOpen,
  assignDialogOpen,
  setAssignDialogOpen,
  enrollDialogOpen,
  setEnrollDialogOpen,
  executeBulk,
  onActionComplete,
  onClearSelection,
}: BulkActionDialogsProps) {
  return (
    <>
      <ConfirmReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${selectedIds.length} ${entityType}(s)`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        reasonRequired={false}
        onConfirm={() => executeBulk('delete')}
      />
      <ConfirmReasonDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        title="Add Tag"
        description="Enter the tag to add to selected items."
        confirmLabel="Add Tag"
        reasonLabel="Tag"
        reasonRequired
        onConfirm={(reason) => executeBulk('tag', { tag_id: reason })}
      />
      <StageSelectDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        onConfirm={(stage) => executeBulk('stage', { stage })}
      />
      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onConfirm={(assigneeId) => executeBulk('assign', { assignee_id: assigneeId })}
      />
      {entityType === 'lead' && (
        <SequenceEnrollDialog
          open={enrollDialogOpen}
          onClose={() => {
            setEnrollDialogOpen(false);
            onActionComplete();
            onClearSelection();
          }}
          leadIds={selectedIds}
        />
      )}
    </>
  );
}

// eslint-disable-next-line max-lines-per-function
export function BulkActionBar({
  selectedIds,
  entityType,
  onClearSelection,
  onActionComplete,
  onMerge,
}: BulkActionBarProps) {
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  if (selectedIds.length === 0) return null;

  async function executeBulk(action: string, params?: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/${entityType}s/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds, params }),
      });
      if (res.ok) {
        onActionComplete();
        onClearSelection();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-40 mx-auto max-w-3xl">
      <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
        <Badge variant="secondary" className="font-mono">
          {selectedIds.length}
        </Badge>
        <span className="text-sm text-muted-foreground">selected</span>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTagDialogOpen(true)}
          disabled={loading}
        >
          <Tag className="mr-1.5 h-3.5 w-3.5" />
          Tag
        </Button>
        {entityType === 'lead' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStageDialogOpen(true)}
            disabled={loading}
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            Stage
          </Button>
        )}
        {entityType === 'lead' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAssignDialogOpen(true)}
            disabled={loading}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Assign
          </Button>
        )}
        {entityType === 'lead' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnrollDialogOpen(true)}
            disabled={loading}
          >
            <GitBranch className="mr-1.5 h-3.5 w-3.5" />
            Enroll
          </Button>
        )}
        {selectedIds.length === 2 &&
          (entityType === 'account' || entityType === 'contact') &&
          onMerge && (
            <Button variant="outline" size="sm" onClick={onMerge} disabled={loading}>
              <Merge className="mr-1.5 h-3.5 w-3.5" />
              Merge
            </Button>
          )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={loading}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
        <button
          onClick={onClearSelection}
          className="ml-2 p-1 text-muted-foreground hover:text-foreground"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <BulkActionDialogs
        selectedIds={selectedIds}
        entityType={entityType}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        tagDialogOpen={tagDialogOpen}
        setTagDialogOpen={setTagDialogOpen}
        stageDialogOpen={stageDialogOpen}
        setStageDialogOpen={setStageDialogOpen}
        assignDialogOpen={assignDialogOpen}
        setAssignDialogOpen={setAssignDialogOpen}
        enrollDialogOpen={enrollDialogOpen}
        setEnrollDialogOpen={setEnrollDialogOpen}
        executeBulk={executeBulk}
        onActionComplete={onActionComplete}
        onClearSelection={onClearSelection}
      />
    </div>
  );
}
