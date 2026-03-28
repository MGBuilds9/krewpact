'use client';

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type Note, useNotesPanel } from '@/hooks/useNotesPanel';

import { NoteItem } from './NoteItem';

interface NotesPanelProps {
  entityType: 'lead' | 'contact' | 'account' | 'opportunity';
  entityId: string;
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

// eslint-disable-next-line max-lines-per-function
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
  } = useNotesPanel(entityType, entityId);

  const handleSaveNote = () =>
    addNote(newContent, () => {
      setAddingNote(false);
      setNewContent('');
    });
  const handleCancelNote = () => {
    setAddingNote(false);
    setNewContent('');
  };
  const handleStartEdit = (n: Note) => {
    setEditingId(n.id);
    setEditContent(n.content);
  };

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
              onSave={handleSaveNote}
              onCancel={handleCancelNote}
            />
          )}
          {loading && <p className="text-xs text-muted-foreground px-4 py-3">Loading notes...</p>}
          {!loading && notes.length === 0 && !addingNote && (
            <p className="text-xs text-muted-foreground px-4 py-3">No notes yet.</p>
          )}
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isEditing={editingId === note.id}
              expanded={expandedIds.has(note.id)}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingId(null)}
              onStartEdit={handleStartEdit}
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
