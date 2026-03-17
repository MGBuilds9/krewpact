'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  sender_type: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface MessagesResponse {
  data: Message[];
  total: number;
  hasMore: boolean;
}

function MessageCard({ msg }: { msg: Message }) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-colors ${msg.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          {msg.subject && <p className="text-sm font-semibold text-gray-900">{msg.subject}</p>}
          <p className="text-xs text-gray-500">
            {msg.sender_type === 'client' ? 'You' : 'Team'} &middot;{' '}
            {new Date(msg.created_at).toLocaleString('en-CA', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        {!msg.is_read && (
          <span className="inline-block w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
        )}
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{msg.body}</p>
    </div>
  );
}

function ComposeForm({
  projectId,
  onSent,
  onError,
}: {
  projectId: string;
  onSent: () => void;
  onError: (msg: string) => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/portal/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim() || undefined, message: body.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send message');
      }
      setSubject('');
      setBody('');
      onSent();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSend}
      className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm space-y-3"
    >
      <h3 className="text-sm font-medium text-gray-700">New Message</h3>
      <input
        type="text"
        placeholder="Subject (optional)"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <textarea
        placeholder="Type your message..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </form>
  );
}

export default function PortalMessagesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/projects/${projectId}/messages`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load messages');
      }
      const data: MessagesResponse = await res.json();
      setMessages(data.data);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        <span className="text-sm text-gray-500">
          {total} message{total !== 1 ? 's' : ''}
        </span>
      </div>
      <ComposeForm projectId={projectId} onSent={fetchMessages} onError={setError} />
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          No messages yet. Start a conversation above.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageCard key={msg.id} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}
