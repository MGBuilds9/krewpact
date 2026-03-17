'use client';

import { useEffect, useRef, useState } from 'react';

import { PortalMessageForm } from '@/components/Portals/PortalMessageForm';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
  portal_account_id: string | null;
  sender_user_id: string | null;
}

interface Props {
  projectId: string;
  portalAccountId: string;
}

function MessageBubble({ msg }: { msg: Message }): React.ReactElement {
  const isFromPortal = msg.direction === 'inbound';
  return (
    <div className={`flex ${isFromPortal ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${isFromPortal ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}
      >
        {msg.subject && (
          <p
            className={`text-xs font-semibold mb-1 ${isFromPortal ? 'text-blue-100' : 'text-gray-500'}`}
          >
            {msg.subject}
          </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
        <p className={`text-[10px] mt-1.5 ${isFromPortal ? 'text-blue-200' : 'text-gray-400'}`}>
          {new Date(msg.created_at).toLocaleString('en-CA', {
            timeStyle: 'short',
            dateStyle: 'short',
          })}
          {isFromPortal && msg.read_at && ' · Read'}
        </p>
      </div>
    </div>
  );
}

export default function PortalMessageThread({ projectId, portalAccountId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch(
        `/api/portals/messages?project_id=${projectId}&portal_account_id=${portalAccountId}&limit=100`,
      );
      if (!cancelled && res.ok) {
        const body = await res.json();
        setMessages(body.data ?? []);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId, portalAccountId, refreshKey]);

  useEffect(() => {
    messages
      .filter((m) => m.direction === 'outbound' && !m.read_at)
      .forEach((m) => {
        fetch(`/api/portals/messages/${m.id}/read`, { method: 'POST' });
      });
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading)
    return <div className="flex justify-center py-12 text-gray-400 text-sm">Loading messages…</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">No messages yet. Send a message to your project team.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-200 pt-4">
        <PortalMessageForm
          portalAccountId={portalAccountId}
          onSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
    </div>
  );
}
