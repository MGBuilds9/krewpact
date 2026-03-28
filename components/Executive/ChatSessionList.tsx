'use client';

import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  context_type: string;
}

interface ChatSessionListProps {
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function ChatSessionList({
  activeSessionId,
  onSelectSession,
  onNewChat,
}: ChatSessionListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/executive/knowledge/sessions');
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  async function handleDelete(sessionId: string) {
    const res = await fetch('/api/executive/knowledge/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) onNewChat();
    }
  }

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-3 border-b">
        <Button onClick={onNewChat} size="sm" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">Loading...</p>
          )}
          {!loading && sessions.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">No past chats</p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-start gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent transition-colors ${
                activeSessionId === session.id ? 'bg-accent' : ''
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate leading-snug">{session.title || 'Untitled'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(session.id);
                }}
                aria-label="Delete session"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
