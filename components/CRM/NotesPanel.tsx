'use client';

import { ChevronDown, ChevronRight, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Note {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

interface NotesPanelProps {
  entityType: 'lead' | 'contact' | 'account' | 'opportunity';
  entityId: string;
}

interface NoteItemProps {
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

function NoteItem({
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
                  onClick={() => onSaveEdit(note.id)}
                  disabled={!editContent.trim()}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
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
        )}
      </div>
    </div>
  );
}

function AddNoteForm({
  content,
  onChange,
  onSave,
  onCancel,
}: {
  content: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-3 bg-muted/20 space-y-2">
      <Textarea
        placeholder="Write a note..."
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm min-h-[80px]"
        autoFocus
      />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={!content.trim()}>
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function useNotesState(entityType: string, entityId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/notes?entity_type=${entityType}&entity_id=${entityId}`);
      const data = await res.json();
      setNotes(data.data ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (content: string, onDone: () => void) => {
    if (!content.trim()) return;
    try {
      const res = await fetch('/api/crm/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          content: content.trim(),
        }),
      });
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      onDone();
    } catch {}
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/crm/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const updated: Note = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingId(null);
    } catch {}
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/crm/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const togglePin = async (note: Note) => {
    try {
      const res = await fetch(`/api/crm/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !note.is_pinned }),
      });
      const updated: Note = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    } catch {}
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return {
    notes,
    loading,
    editingId,
    setEditingId,
    editContent,
    setEditContent,
    expandedIds,
    addNote,
    saveEdit,
    deleteNote,
    togglePin,
    toggleExpand,
  };
}

export function NotesPanel({ entityType, entityId }: NotesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newContent, setNewContent] = useState('');
  const {
    notes,
    loading,
    editingId,
    setEditingId,
    editContent,
    setEditContent,
    expandedIds,
    addNote,
    saveEdit,
    deleteNote,
    togglePin,
    toggleExpand,
  } = useNotesState(entityType, entityId);

  const sorted = [...notes.filter((n) => n.is_pinned), ...notes.filter((n) => !n.is_pinned)];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-muted/50 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="text-sm font-medium">Notes</span>
          <span className="text-xs text-muted-foreground">({notes.length})</span>
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setAddingNote(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      {!collapsed && (
        <div className="divide-y">
          {addingNote && (
            <AddNoteForm
              content={newContent}
              onChange={setNewContent}
              onSave={() =>
                addNote(newContent, () => {
                  setAddingNote(false);
                  setNewContent('');
                })
              }
              onCancel={() => {
                setAddingNote(false);
                setNewContent('');
              }}
            />
          )}
          {loading && <p className="text-xs text-muted-foreground px-4 py-3">Loading notes...</p>}
          {!loading && sorted.length === 0 && !addingNote && (
            <p className="text-xs text-muted-foreground px-4 py-3">No notes yet.</p>
          )}
          {sorted.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isEditing={editingId === note.id}
              expanded={expandedIds.has(note.id)}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingId(null)}
              onStartEdit={(n) => {
                setEditingId(n.id);
                setEditContent(n.content);
              }}
              onToggleExpand={toggleExpand}
              onPin={togglePin}
              onDelete={deleteNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
