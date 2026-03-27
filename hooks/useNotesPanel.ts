'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Note {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export function useNotesPanel(entityType: string, entityId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/notes?entity_type=${entityType}&entity_id=${entityId}`);
      setNotes((await res.json()).data ?? []);
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
