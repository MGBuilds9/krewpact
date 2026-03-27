'use client';

import { Pencil, Pin, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Note } from '@/hooks/useNotesPanel';

function NoteEditForm({
  noteId,
  editContent,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
}: {
  noteId: string;
  editContent: string;
  onEditContentChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="space-y-2">
      <Textarea
        value={editContent}
        onChange={(e) => onEditContentChange(e.target.value)}
        className="text-sm min-h-[80px]"
        autoFocus
      />
      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSaveEdit(noteId)}
          disabled={!editContent.trim()}
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelEdit}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function NoteActions({
  note,
  onPin,
  onStartEdit,
  onDelete,
}: {
  note: Note;
  onPin: (n: Note) => void;
  onStartEdit: (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      <button
        onClick={() => onPin(note)}
        className={`p-1 rounded hover:bg-muted transition-colors ${note.is_pinned ? 'text-amber-500' : 'text-muted-foreground'}`}
        title={note.is_pinned ? 'Unpin' : 'Pin'}
      >
        <Pin className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onStartEdit(note)}
        className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onDelete(note.id)}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export interface NoteItemProps {
  note: Note;
  isEditing: boolean;
  expanded: boolean;
  editContent: string;
  onEditContentChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (note: Note) => void;
  onToggleExpand: (id: string) => void;
  onPin: (note: Note) => void;
  onDelete: (id: string) => void;
}

export function NoteItem({
  note,
  isEditing,
  expanded,
  editContent,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onToggleExpand,
  onPin,
  onDelete,
}: NoteItemProps) {
  return (
    <div className="px-4 py-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {note.is_pinned && (
            <div className="flex items-center gap-1 mb-1">
              <Pin className="h-3 w-3 text-amber-500" fill="currentColor" />
              <span className="text-xs text-amber-600 font-medium">Pinned</span>
            </div>
          )}
          {isEditing ? (
            <NoteEditForm
              noteId={note.id}
              editContent={editContent}
              onEditContentChange={onEditContentChange}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
          ) : (
            <>
              <p
                className={`text-sm whitespace-pre-wrap break-words ${!expanded ? 'line-clamp-3' : ''}`}
              >
                {note.content}
              </p>
              {note.content.length > 160 && (
                <button
                  onClick={() => onToggleExpand(note.id)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-0.5"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(note.created_at).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
        {!isEditing && (
          <NoteActions note={note} onPin={onPin} onStartEdit={onStartEdit} onDelete={onDelete} />
        )}
      </div>
    </div>
  );
}
