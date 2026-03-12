'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pin, Trash2, Pencil, Plus, ChevronDown, ChevronRight } from 'lucide-react';

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

export function NotesPanel({ entityType, entityId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [newContent, setNewContent] = useState('');
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

  async function addNote() {
    if (!newContent.trim()) return;
    try {
      const res = await fetch('/api/crm/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          content: newContent.trim(),
        }),
      });
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewContent('');
      setAddingNote(false);
    } catch {}
  }

  async function saveEdit(id: string) {
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
  }

  async function deleteNote(id: string) {
    try {
      await fetch(`/api/crm/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  }

  async function togglePin(note: Note) {
    try {
      const res = await fetch(`/api/crm/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !note.is_pinned }),
      });
      const updated: Note = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    } catch {}
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const pinned = notes.filter((n) => n.is_pinned);
  const unpinned = notes.filter((n) => !n.is_pinned);
  const sorted = [...pinned, ...unpinned];

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
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
          {/* Add note inline */}
          {addingNote && (
            <div className="p-3 bg-muted/20 space-y-2">
              <Textarea
                placeholder="Write a note..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="text-sm min-h-[80px]"
                autoFocus
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={addNote}
                  disabled={!newContent.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setAddingNote(false);
                    setNewContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loading && <p className="text-xs text-muted-foreground px-4 py-3">Loading notes...</p>}

          {!loading && sorted.length === 0 && !addingNote && (
            <p className="text-xs text-muted-foreground px-4 py-3">No notes yet.</p>
          )}

          {sorted.map((note) => {
            const expanded = expandedIds.has(note.id);
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className="px-4 py-3 group">
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
                          onChange={(e) => setEditContent(e.target.value)}
                          className="text-sm min-h-[80px]"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => saveEdit(note.id)}
                            disabled={!editContent.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setEditingId(null)}
                          >
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
                            onClick={() => toggleExpand(note.id)}
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
                        onClick={() => togglePin(note)}
                        className={`p-1 rounded hover:bg-muted transition-colors ${note.is_pinned ? 'text-amber-500' : 'text-muted-foreground'}`}
                        title={note.is_pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(note.id);
                          setEditContent(note.content);
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
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
          })}
        </div>
      )}
    </div>
  );
}
