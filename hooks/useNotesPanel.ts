'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { apiFetch, apiFetchList } from '@/lib/api-client';
import { updateArrayQueryData } from '@/lib/query-cache';
import { queryKeys } from '@/lib/query-keys';

export interface Note {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return Number(b.is_pinned) - Number(a.is_pinned);
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function useNotesPanel(entityType: string, entityId: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => queryKeys.notes.list(entityType, entityId),
    [entityType, entityId],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const notesQuery = useQuery({
    queryKey,
    queryFn: () =>
      apiFetchList<Note>('/api/crm/notes', {
        params: {
          entity_type: entityType,
          entity_id: entityId,
        },
      }),
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
  });

  const updateNotesCache = (updater: (current: Note[]) => Note[]) => {
    updateArrayQueryData<Note>(queryClient, queryKey, (current) => sortNotes(updater(current)));
  };

  const addNoteMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch<Note>('/api/crm/notes', {
        method: 'POST',
        body: {
          entity_type: entityType,
          entity_id: entityId,
          content: content.trim(),
        },
      }),
    onSuccess: (createdNote) => {
      updateNotesCache((current) => [
        createdNote,
        ...current.filter((note) => note.id !== createdNote.id),
      ]);
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiFetch<Note>(`/api/crm/notes/${id}`, {
        method: 'PATCH',
        body: { content: content.trim() },
      }),
    onSuccess: (updatedNote) => {
      updateNotesCache((current) =>
        current.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/crm/notes/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_result, deletedId) => {
      updateNotesCache((current) => current.filter((note) => note.id !== deletedId));
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (note: Note) =>
      apiFetch<Note>(`/api/crm/notes/${note.id}`, {
        method: 'PATCH',
        body: { is_pinned: !note.is_pinned },
      }),
    onSuccess: (updatedNote) => {
      updateNotesCache((current) =>
        current.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
      );
    },
  });

  const notes = useMemo(() => sortNotes(notesQuery.data ?? []), [notesQuery.data]);

  const addNote = async (content: string, onDone: () => void) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      await queryClient.cancelQueries({ queryKey });
      await addNoteMutation.mutateAsync(trimmed);
      onDone();
    } catch {
      // Swallow errors to preserve the panel's previous behavior.
    }
  };

  const saveEdit = async (id: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;

    try {
      await queryClient.cancelQueries({ queryKey });
      await saveEditMutation.mutateAsync({ id, content: trimmed });
      setEditingId(null);
      setEditContent('');
    } catch {
      // Swallow errors to preserve the panel's previous behavior.
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await queryClient.cancelQueries({ queryKey });
      await deleteMutation.mutateAsync(id);
      if (editingId === id) {
        setEditingId(null);
        setEditContent('');
      }
    } catch {
      // Swallow errors to preserve the panel's previous behavior.
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await queryClient.cancelQueries({ queryKey });
      await togglePinMutation.mutateAsync(note);
    } catch {
      // Swallow errors to preserve the panel's previous behavior.
    }
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
    loading: notesQuery.isLoading,
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
