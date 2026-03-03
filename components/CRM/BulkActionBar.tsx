'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Tag, Trash2, ArrowRight, Users } from 'lucide-react';

interface BulkActionBarProps {
  selectedIds: string[];
  entityType: 'lead' | 'contact';
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionBar({
  selectedIds,
  entityType,
  onClearSelection,
  onActionComplete,
}: BulkActionBarProps) {
  const [loading, setLoading] = useState(false);

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

  async function handleTag() {
    const tagId = prompt('Enter tag ID to add:');
    if (tagId) {
      await executeBulk('tag', { tag_id: tagId });
    }
  }

  async function handleStageChange() {
    if (entityType !== 'lead') return;
    const stage = prompt(
      'Enter new stage (new, contacted, qualified, proposal, negotiation, won, lost):',
    );
    if (stage) {
      await executeBulk('stage', { stage });
    }
  }

  async function handleDelete() {
    if (confirm(`Delete ${selectedIds.length} ${entityType}(s)? This cannot be undone.`)) {
      await executeBulk('delete');
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

        <Button variant="outline" size="sm" onClick={handleTag} disabled={loading}>
          <Tag className="mr-1.5 h-3.5 w-3.5" />
          Tag
        </Button>

        {entityType === 'lead' && (
          <Button variant="outline" size="sm" onClick={handleStageChange} disabled={loading}>
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            Stage
          </Button>
        )}

        {entityType === 'lead' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const userId = prompt('Enter user ID to assign:');
              if (userId) executeBulk('assign', { assigned_to: userId });
            }}
            disabled={loading}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Assign
          </Button>
        )}

        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>

        <button
          onClick={onClearSelection}
          className="ml-2 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
